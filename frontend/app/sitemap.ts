import { MetadataRoute } from 'next';

/**
 * Sitemap.xml Generation
 * 
 * Provides search engines with a map of all crawlable pages
 * Prioritizes public-facing pages:
 * - Landing page
 * - Application form
 * - Status lookup
 * 
 * Excludes:
 * - Private dashboards (require authentication)
 * - Auth pages (no SEO value)
 * - API routes (not crawlable)
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const today = new Date().toISOString().split('T')[0];

  return [
    // Home page - highest priority
    {
      url: baseUrl,
      lastModified: today,
      changeFrequency: 'weekly',
      priority: 1.0,
    },

    // Application form - important for conversion
    {
      url: `${baseUrl}/apply`,
      lastModified: today,
      changeFrequency: 'monthly',
      priority: 0.9,
    },

    // Status lookup - students need to find it
    {
      url: `${baseUrl}/status`,
      lastModified: today,
      changeFrequency: 'monthly',
      priority: 0.8,
    },

    // Note: Excluded from sitemap (no SEO value, require auth):
    // - /dashboard/* (private, behind auth)
    // - /login (auth page, no indexing needed)
    // - /auth/* (callback URLs)
    // - /api/* (not crawlable)

    // Future: Add blog posts, resource pages, etc. here
    // {
    //   url: `${baseUrl}/blog/getting-started`,
    //   lastModified: today,
    //   changeFrequency: 'weekly',
    //   priority: 0.7,
    // },
  ];
}
