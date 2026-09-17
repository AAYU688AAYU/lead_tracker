# SEO Setup & Configuration Guide

## Overview

Apex CRM implements SEO best practices to ensure discoverability for prospective students and partner institutions. This guide covers configuration, monitoring, and optimization.

## Current Implementation

### Files Generated

**1. robots.ts** (`app/robots.ts`)
- Auto-generated at build time
- Tells search engines which pages to crawl
- Blocks private dashboards and auth pages
- Allows public pages: /, /apply, /status, /api/health

**2. sitemap.ts** (`app/sitemap.ts`)
- Auto-generated at build time
- Prioritizes public-facing pages
- Sets change frequency and priority levels
- Accessible at `/sitemap.xml`

### Metadata Configuration

**Root Layout** (`app/layout.tsx`)
- OpenGraph tags for social sharing
- Twitter Card tags for social preview
- Keywords, authors, publisher
- Canonical URLs
- Icons and favicons

**Dashboard Pages** (`generateMetadata` functions)
- Consultant dashboard: personalized title + description
- Admin dashboard: admin-specific title + description
- Student dashboard: personalized title + description

## Robots.txt Configuration

**File:** `app/robots.ts`

**Public Pages (Allow Crawling):**
```
/                   - Home page
/apply              - Application form
/status             - Status lookup
/api/health         - Health check endpoint
```

**Private Pages (Disallow):**
```
/dashboard          - Requires authentication
/login              - Auth page
/auth/              - Auth callbacks
/api/               - API routes (except /health)
/_next              - Next.js internals
```

**Crawl Strategy:**
- Crawl delay: 1 second (prevents server overload)
- Blocks aggressive bots: AhrefsBot, SemrushBot, DotBot
- Special handling for Googlebot and Bingbot

**Testing:**
```bash
# View generated robots.txt
curl https://apexcrm.com/robots.txt

# Verify in Google Search Console
# Settings → Crawlers → Test live URL
```

## Sitemap Configuration

**File:** `app/sitemap.ts`

**Included Pages:**
```
/                   Priority: 1.0 (highest)
/apply              Priority: 0.9 (high)
/status             Priority: 0.8 (medium)
```

**Change Frequency:**
- Home: weekly (may update with news)
- Apply: monthly (form rarely changes)
- Status: monthly (lookup tool)

**Testing:**
```bash
# View generated sitemap
curl https://apexcrm.com/sitemap.xml

# Validate XML
# https://www.xml-sitemaps.com/validate-xml-sitemap.html

# Submit to Google Search Console
# Coverage → Sitemaps → New Sitemap
```

## Search Engine Setup

### Google Search Console

**Setup:**
1. Visit https://search.google.com/search-console
2. Add property: `https://apexcrm.com`
3. Verify ownership:
   - Option A: Add DNS record (fastest)
   - Option B: Upload HTML file to root
   - Option C: Google Analytics integration
4. Submit sitemap:
   - URL: `https://apexcrm.com/sitemap.xml`
   - Coverage → Sitemaps → New Sitemap

**Key Metrics to Monitor:**
- **Impressions:** How often site appears in search results
- **Clicks:** How many users visit from search
- **CTR:** Click-through rate (target: >3%)
- **Avg Position:** Ranking position (target: top 10)
- **Index Coverage:** % of pages indexed (target: 100%)

**Common Issues:**
- "Excluded by robots.txt" → Check robots.ts
- "Not indexed" → Check noindex meta tag
- "Crawl errors" → Check error.tsx files

### Bing Webmaster Tools

**Setup:**
1. Visit https://www.bing.com/webmasters
2. Add site: `https://apexcrm.com`
3. Verify with DNS or HTML file
4. Submit sitemap:
   - Same as Google

**Additional Options:**
- Set crawl rate (conservative recommended)
- Configure geographic targeting
- Monitor mobile usability

### Yandex (for international traffic)

**Setup:**
1. https://webmaster.yandex.com/
2. Add and verify site
3. Submit sitemap

## Metadata Best Practices

### Title Tags

**Format:** `{page} — Apex CRM`

**Examples:**
```
Home: "Apex CRM"
Apply: "Apply — Apex CRM"
Status: "Check Application Status — Apex CRM"
Dashboard: "{User} — Apex CRM"
```

**Best Practices:**
- ✅ Unique per page
- ✅ 50-60 characters (displays fully in search results)
- ✅ Keyword in title if natural
- ❌ Avoid stuffing keywords
- ❌ No special characters
- ❌ Don't repeat company name

### Meta Descriptions

**Format:** Brief summary of page content (155-160 characters)

**Examples:**
```
Home: "Streamline your admissions process with Apex CRM. Manage leads, track conversations, and monitor student progress."

Apply: "Submit your application for admission. Tell us about yourself and your educational goals."

Status: "Check the status of your application in real-time. Track your progress through the admission process."
```

**Best Practices:**
- ✅ Natural language
- ✅ Includes primary keyword
- ✅ Clear call-to-action if appropriate
- ✅ 155-160 characters (full display)
- ❌ Duplicate descriptions
- ❌ Auto-generated content
- ❌ Stuffed keywords

### Headings (H1, H2, H3)

**Structure:**
```
H1: Page main topic (one per page)
  H2: Section heading
    H3: Subsection
    H3: Subsection
  H2: Another section
    H3: Subsection
```

**Example:** /apply page
```
H1: Apply for Admission
  H2: Student Information
    H3: Personal Details
    H3: Contact Information
  H2: Program Selection
    H3: Choose Your Program
  H2: Additional Information
```

**Best Practices:**
- ✅ Exactly one H1 per page
- ✅ Logical hierarchy (H2 → H3, not H2 → H4)
- ✅ Descriptive, keyword-relevant
- ❌ Multiple H1s
- ❌ Using for styling only
- ❌ Skipping levels (H2 → H4)

## Structured Data (Schema.org)

### Organization Schema

Add to root layout for rich snippets:

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Apex CRM",
  "url": "https://apexcrm.com",
  "logo": "https://apexcrm.com/logo.png",
  "sameAs": [
    "https://twitter.com/apexcrm",
    "https://linkedin.com/company/apexcrm",
    "https://facebook.com/apexcrm"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "Customer Support",
    "email": "support@apexcrm.com"
  }
}
```

**Implementation:**
```tsx
// In app/layout.tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      // ... schema data
    }),
  }}
/>
```

### Breadcrumb Schema (Dashboard Pages)

For navigation clarity:

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://apexcrm.com"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Dashboard",
      "item": "https://apexcrm.com/dashboard"
    }
  ]
}
```

## Performance Impact on SEO

Search engines consider performance when ranking. Target metrics:

| Metric | Target |
|--------|--------|
| LCP (Largest Contentful Paint) | <2.5s |
| FID (First Input Delay) | <100ms |
| CLS (Cumulative Layout Shift) | <0.1 |
| First Contentful Paint | <1.8s |

**Current optimizations:**
- Skeleton loaders (perceived faster)
- Image optimization (50% smaller)
- Code splitting (faster JS execution)
- Error boundaries (better UX)

## URL Structure

**Current URLs (SEO-friendly):**

```
/                      - Home
/apply                 - Application form
/status                - Status lookup
/dashboard/*           - Private (excluded from SEO)
```

**Best practices applied:**
- ✅ Descriptive (not /page?id=123)
- ✅ Lowercase
- ✅ Hyphens instead of underscores
- ✅ No trailing slashes (Next.js redirects)
- ✅ Consistent structure
- ✅ No query parameters for navigation

## Monitoring & Reporting

### Weekly Checks

1. **Google Search Console**
   - Check new errors in Coverage tab
   - Monitor impressions and clicks
   - Review top queries

2. **Core Web Vitals**
   - LCP: Should be <2.5s
   - FID: Should be <100ms
   - CLS: Should be <0.1

3. **Rankings**
   - Track top 10 keywords
   - Monitor position changes

### Monthly Tasks

1. **Audit Metadata**
   - Check title tags are unique
   - Verify descriptions accurate
   - Check for noindex tags

2. **Update Sitemap**
   - Add new public pages
   - Remove deleted pages
   - Resubmit to Google

3. **Check Backlinks**
   - Monitor new linking domains
   - Remove toxic links (via disavow)
   - Identify partnership opportunities

### Quarterly Review

1. **Comprehensive Audit**
   - Use Screaming Frog or SEMrush
   - Check 404 errors
   - Verify all redirects
   - Audit mobile usability

2. **Competitor Analysis**
   - Monitor competitor rankings
   - Identify content gaps
   - Benchmark performance

3. **Strategy Update**
   - Adjust target keywords
   - Update content calendar
   - Plan new resources

## Common Issues & Solutions

### Robots.txt Blocking Content

**Problem:** "Excluded by robots.txt" in Search Console
```
Solution: Check app/robots.ts
- Verify path isn't in disallow
- Use robots.txt testing tool
- Resubmit page in Search Console
```

### Sitemap Not Found

**Problem:** Sitemap submission fails
```
Solution: Verify sitemap URL
- curl https://apexcrm.com/sitemap.xml (should return XML)
- Check app/sitemap.ts generates correctly
- Verify Next.js build includes sitemap
```

### Low Click-Through Rate (CTR)

**Problem:** High impressions, low clicks (CTR <3%)
```
Solutions:
1. Improve meta descriptions (make more compelling)
2. Add CTAs in descriptions ("Learn more", "Get started")
3. Verify titles are clear and keyword-relevant
4. Check SERP preview in Google Search Console
```

### Not Indexed

**Problem:** Page doesn't appear in search results
```
Solution steps:
1. Check robots.txt (isn't being blocked)
2. Check for noindex meta tag (shouldn't have it)
3. Check page is publicly accessible (not behind paywall)
4. Use "Inspect URL" in Search Console
5. Request indexing manually
```

## Checklist Before Launch

- [ ] robots.ts is configured and accessible
- [ ] sitemap.xml is generated and accessible
- [ ] Sitemap submitted to Google Search Console
- [ ] Sitemap submitted to Bing Webmaster Tools
- [ ] All public pages have unique title tags
- [ ] All public pages have meta descriptions
- [ ] H1 hierarchy is correct on all pages
- [ ] OpenGraph tags are set for social sharing
- [ ] Canonical URLs are correct
- [ ] No noindex meta tags on public pages
- [ ] Mobile usability is verified (no errors)
- [ ] Core Web Vitals are within targets
- [ ] 404 page is user-friendly
- [ ] Internal links are working
- [ ] Redirects are in place for moved content
- [ ] Schema markup is valid (if implemented)

## References

- [Google Search Central](https://developers.google.com/search)
- [robots.txt Specification](https://www.robotstxt.org/)
- [Sitemaps Protocol](https://www.sitemaps.org/)
- [Schema.org](https://schema.org/)
- [Next.js Metadata](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [Core Web Vitals Guide](https://web.dev/vitals/)
- [Google Search Console Help](https://support.google.com/webmasters)
