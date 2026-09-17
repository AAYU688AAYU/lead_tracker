# Development

Implementation guides and development resources.

## Contents

- **[Implementation Summary](IMPLEMENTATION_SUMMARY.md)** — High-level project overview and feature summary
- **[UI/UX Design Prompt](STITCH_UI_UX_PROMPT.md)** — Component specifications, design system, and UI guidelines

## Quick Start

### Local Development Setup

```bash
# Frontend
cd frontend
npm install
npm run dev              # Runs on http://localhost:3000

# Supabase (local)
cd supabase
supabase start           # Spin up local PostgreSQL + Realtime + Auth
supabase db push         # Apply pending migrations
```

### Common Development Tasks

**Running Tests:**
```bash
cd frontend
npm run test             # Run test suite
npm run type-check       # TypeScript validation
```

**Building for Production:**
```bash
cd frontend
npm run build            # Production bundle
npm run start            # Local production server
```

**Database Migrations:**
```bash
cd supabase
supabase migration new   # Create new migration
supabase db push         # Apply to local
supabase db push --remote --linked  # Apply to production
```

## Architecture Overview

See [System Architecture Documentation](../architecture/README.md) for detailed component descriptions.

---

For ongoing development patterns and standards, refer to phase-specific implementation guides in [../phases/](../phases/).
