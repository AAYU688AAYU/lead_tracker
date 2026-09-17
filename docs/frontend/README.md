# Frontend Documentation

This directory contains comprehensive documentation for the Lead Tracker frontend application, a [Next.js](https://nextjs.org)-based educational placement CRM.

## Quick Navigation

- **[Implementation Guides](./implementation-guides/)** — In-depth guides for specific features, patterns, and optimizations
- **[Reference](./reference/)** — Agent rules, configuration, and implementation context
- **[Assets](./assets/)** — Audio files and asset documentation

## Directory Structure

```
docs/frontend/
├── README.md                         # This file
├── implementation-guides/            # Feature and optimization guides
│   ├── ANALYTICS_MATERIALIZED_VIEWS_GUIDE.md
│   ├── ARIA_LIVE_REGIONS.md
│   ├── AUDIT_LOGGING_GUIDE.md
│   ├── CACHING_STRATEGY_GUIDE.md
│   ├── CONSULTANT_STATUS_GUIDE.md
│   ├── DATABASE_INDEXING_GUIDE.md
│   ├── E2E_TEST_GUIDE.md
│   ├── EDGE_FUNCTION_RESILIENCE.md
│   ├── ERROR_HANDLING_GUIDE.md
│   ├── IMAGE_OPTIMIZATION.md
│   ├── JWT_MIDDLEWARE_OPTIMIZATION.md
│   ├── LOADING_UI_GUIDE.md
│   ├── MONITORING_SETUP.md
│   ├── MUTATION_ERROR_HANDLING.md
│   ├── N_PLUS_1_OPTIMIZATION.md
│   ├── OG_IMAGE_SETUP.md
│   ├── PAGINATION_IMPLEMENTATION_GUIDE.md
│   ├── PASSWORD_VALIDATION_GUIDE.md
│   ├── PHONE_NORMALIZATION_GUIDE.md
│   ├── REALTIME_RECOVERY_GUIDE.md
│   ├── RESPONSIVE_DESIGN_GUIDE.md
│   ├── SEO_SETUP.md
│   ├── SERVER_ACTION_TIMEOUTS_GUIDE.md
│   ├── XSS_PREVENTION.md
│   └── ZOD_VALIDATION_GUIDE.md
├── reference/                        # Configuration and context
│   ├── AGENTS.md                     # Next.js agent rules
│   ├── PHASE8_IMPLEMENTATION.md      # Phase 8 test implementation
│   └── CLAUDE.md                     # AI context notes
└── assets/                           # Asset documentation
    └── AUDIO_ASSETS_README.md        # Audio file documentation
```

## Implementation Guides

The `implementation-guides/` directory contains detailed documentation for:

- **Architecture Patterns** — Best practices for error handling, caching, and validation
- **Security** — XSS prevention, JWT optimization, API security patterns
- **Performance** — N+1 optimization, database indexing, image optimization
- **Real-time Features** — Recovery patterns, connection handling
- **UI/UX** — ARIA live regions, loading states, responsive design
- **Testing** — E2E test strategies and implementation
- **Monitoring** — Analytics, audit logging, monitoring setup

## Reference Documents

The `reference/` directory contains:

- **AGENTS.md** — Next.js agent execution rules and constraints
- **PHASE8_IMPLEMENTATION.md** — Test infrastructure implementation details
- **CLAUDE.md** — AI model context and development notes

## Getting Started

To start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

For complete project setup instructions, see [SETUP.md](../../SETUP.md).
