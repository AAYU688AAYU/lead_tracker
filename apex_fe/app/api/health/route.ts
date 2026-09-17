import { createClient } from '@/lib/supabase/server';

/**
 * Health Check Endpoint
 * 
 * GET /api/health
 * 
 * Returns 200 when all systems are operational:
 * - Frontend server is running
 * - Supabase connection is healthy
 * - Database is responsive
 * 
 * Returns 503 (Service Unavailable) if any dependency fails
 * 
 * Usage:
 * - Uptime monitoring (ping every 60s)
 * - Load balancer health checks
 * - Deployment verification
 * - Incident alerting
 */

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    api: { status: 'up' | 'down'; responseTime: number };
    database: { status: 'up' | 'down'; responseTime: number };
  };
  version?: string;
}

export async function GET(): Promise<Response> {
  const startTime = Date.now();
  const response: HealthCheckResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      api: { status: 'up', responseTime: 0 },
      database: { status: 'up', responseTime: 0 },
    },
  };

  try {
    // Check 1: API is responding (implicit, since we got here)
    response.checks.api.responseTime = Date.now() - startTime;

    // Check 2: Database connectivity
    const dbStartTime = Date.now();
    try {
      const supabase = await createClient();

      // Lightweight query to verify connection
      // Using a simple RLS-enabled table query
      const { error, data } = await supabase
        .from('leads')
        .select('count(*)', { count: 'exact', head: true })
        .limit(1);

      response.checks.database.responseTime = Date.now() - dbStartTime;

      if (error) {
        console.error('Database health check failed:', error);
        response.checks.database.status = 'down';
        response.status = 'degraded';
      } else {
        response.checks.database.status = 'up';
      }
    } catch (dbError) {
      response.checks.database.responseTime = Date.now() - dbStartTime;
      response.checks.database.status = 'down';
      response.status = 'degraded';
      console.error('Database connection error:', dbError);
    }

    // Return appropriate status code
    const statusCode = response.status === 'healthy' ? 200 : 503;

    return new Response(JSON.stringify(response), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, public, max-age=10', // Cache for 10s as per vercel.json
        'X-Health-Check': 'true',
      },
    });
  } catch (error) {
    console.error('Health check endpoint error:', error);

    const errorResponse: HealthCheckResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: {
        api: { status: 'down', responseTime: Date.now() - startTime },
        database: { status: 'down', responseTime: 0 },
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
  }
}

/**
 * Lightweight HEAD request for uptime monitors that don't need response body
 */
export async function HEAD(): Promise<Response> {
  try {
    const supabase = await createClient();

    // Quick connection check
    await supabase
      .from('leads')
      .select('count(*)', { count: 'exact', head: true })
      .limit(1);

    return new Response(null, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, public, max-age=10',
        'X-Health-Check': 'true',
      },
    });
  } catch (error) {
    console.error('HEAD health check failed:', error);
    return new Response(null, { status: 503 });
  }
}
