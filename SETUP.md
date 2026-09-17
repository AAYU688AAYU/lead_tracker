# Setup Guide

Complete setup instructions for Lead Tracker development and deployment.

## Prerequisites

- **Node.js:** 18+ (recommend 20 LTS)
- **npm/pnpm:** 9+
- **Supabase CLI:** Latest version
- **Git:** For version control
- **Docker:** For local Supabase (optional, auto-installed by Supabase CLI)

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/lead_tracker
cd lead_tracker
```

### 2. Setup Frontend

```bash
cd frontend
npm install

# Copy environment template
cp .env.local.example .env.local

# Edit .env.local with your Supabase credentials (see step 3)
```

### 3. Setup Local Supabase

```bash
cd supabase

# Start local Supabase stack (PostgreSQL, Realtime, Auth, etc.)
supabase start

# Apply migrations to local database
supabase db push

# (Optional) Seed initial data
# supabase db seed

# View local dashboard
# Supabase Studio: http://localhost:54323
```

### 4. Get Supabase Credentials

From the Supabase Studio dashboard (http://localhost:54323):

1. Go to **Settings** → **API**
2. Copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` secret → `SUPABASE_SERVICE_ROLE_KEY`

Paste into `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 5. Start Development Server

```bash
cd frontend
npm run dev
```

Visit http://localhost:3000 to see the app.

## Environment Variables

### Frontend (.env.local)

```env
# Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Optional: Email/SMS providers
RESEND_API_KEY=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...

# Optional: Third-party integrations
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Common Tasks

### Database Migrations

```bash
cd supabase

# Create a new migration
supabase migration new <migration_name>

# Edit the generated SQL file in migrations/
# Then apply to local database:
supabase db push

# To apply to production (after testing):
supabase db push --remote --linked
```

### Running Tests

```bash
cd frontend

# Run all tests
npm run test

# Run specific test file
npm run test -- auth.test.ts

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Type Checking

```bash
cd frontend

# Check TypeScript types
npm run type-check

# Watch mode
npm run type-check -- --watch
```

### Building for Production

```bash
cd frontend

# Create optimized production build
npm run build

# Test the build locally
npm run start
```

## Deployment

### To Staging

1. Push to `staging` branch
2. GitHub Actions automatically deploys to staging environment
3. Verify at https://staging.lead-tracker.com

### To Production

1. Create PR from `develop` → `main`
2. Merge after code review
3. GitHub Actions automatically deploys to production
4. Run migrations on production database:

```bash
supabase db push --remote --linked
```

For detailed deployment procedures, see [docs/phases/PHASE10/DEPLOYMENT_CHECKLIST.md](docs/phases/PHASE10/DEPLOYMENT_CHECKLIST.md).

## Troubleshooting

### Supabase Won't Start

```bash
# Reset Supabase
supabase stop
supabase start

# If that doesn't work, remove Docker containers
docker ps -a | grep supabase | awk '{print $1}' | xargs docker rm -f
supabase start
```

### Port Already in Use

```bash
# Frontend runs on :3000, Supabase on :54321, :54322, :54323
# If ports are taken, kill the process or use different ports:
PORT=3001 npm run dev
```

### Database Migrations Failed

```bash
# Check migration status
supabase migration list

# Rollback and retry
supabase migration repair
supabase db push
```

### Missing Environment Variables

Make sure `.env.local` exists and contains all required variables. Use `.env.local.example` as template:

```bash
cd frontend
cp .env.local.example .env.local
# Edit .env.local with your values
```

## Additional Resources

- **[Setup Troubleshooting](docs/development/README.md)** — Common issues and solutions
- **[Development Guide](docs/development/README.md)** — Development workflow
- **[Architecture Overview](docs/architecture/README.md)** — System design
- **[Testing Guide](docs/testing/README.md)** — QA procedures

---

**Need help?** See [README.md](README.md#-support) for support options.
