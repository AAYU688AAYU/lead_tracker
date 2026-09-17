import { MetadataRoute } from 'next';

/**
 * Robots.txt Configuration
 * 
 * Tells search engines which pages to crawl and which to avoid
 * Reduces unnecessary crawl budget spent on:
 * - Private dashboards (behind auth)
 * - API routes
 * - Admin pages
 * - Static files
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return {
    rules: [
      {
        // Public pages - allow all bots
        userAgent: '*',
        allow: [
          '/',
          '/apply',
          '/status',
          '/api/health', // Health check is public
        ],
        disallow: [
          '/dashboard', // Private - requires auth
          '/login', // No value in indexing auth pages
          '/auth/', // Auth callbacks
          '/api/', // All API routes except /health
          '/_next', // Next.js internals
          '/public/', // Static files
          '*.json', // JSON files
          '*.css', // CSS files (served via Next.js)
          '*.js', // JS files (served via Next.js)
        ],
      },
      {
        // Googlebot - allow crawling of API routes for indexing
        userAgent: 'Googlebot',
        allow: ['/api/health'],
        disallow: ['/api/'], // Still block other API routes
      },
      {
        // Bingbot
        userAgent: 'Bingbot',
        allow: ['/'],
        disallow: ['/dashboard', '/login', '/auth', '/api'],
      },
      {
        // Block bad bots
        userAgent: [
          'AhrefsBot',
          'SemrushBot',
          'DotBot',
          'MJ12bot',
          'ExtLinksBot',
        ],
        disallow: ['/'],
      },
    ],

    // Crawl delay for all bots (ms between requests)
    crawlDelay: {
      '*': 1, // 1 second between requests
    },

    // Sitemap location
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
