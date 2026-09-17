# Open Graph Image Setup Guide

## Overview

Open Graph (OG) images are displayed when sharing Apex CRM links on social media, messaging apps, and previews. Proper OG images increase click-through rates and improve branding.

## Required Images

Two images are needed for optimal social sharing:

### 1. Rectangle Image (1200×630px)
**File:** `public/og-image.png`
**Use:** Twitter, Facebook, LinkedIn, Slack, iMessage previews
**Aspect ratio:** 16:9 (wider format)
**Recommended:** Include logo, headline, and key visual

**Specification:**
```
Dimensions: 1200×630px
Format: PNG or JPG
File size: <200KB
Color mode: RGB (not CMYK)
Resolution: 72 DPI
```

### 2. Square Image (400×400px)
**File:** `public/og-image-square.png`
**Use:** Profile pictures, app store listings, fallback
**Aspect ratio:** 1:1 (square)

**Specification:**
```
Dimensions: 400×400px
Format: PNG or JPG
File size: <100KB
Color mode: RGB
Resolution: 72 DPI
```

## Design Guidelines

### Visual Requirements
- **Logo:** Top left or center (recognizable)
- **Text:** Bold, legible at small sizes (preview is ~300×300px on mobile)
- **Brand colors:** Use Apex CRM colors
  - Primary: `#2B5F4A` (accent green)
  - Background: `#FAFAF9` (light)
  - Text: `#1A1A18` (dark)
- **Contrast:** Minimum 4.5:1 for text on background

### Rectangle (1200×630) Layout
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🔷 Logo        Apex CRM                                   │
│                 Admissions Pipeline Management              │
│                                                             │
│  Manage leads • Track conversations • Monitor progress      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Square (400×400) Layout
```
┌────────────────┐
│       🔷       │
│   Apex CRM     │
│                │
│   CRM for      │
│  Admissions    │
└────────────────┘
```

## Creating OG Images

### Option 1: Design Tools (Recommended)

**Figma Template:**
1. Create new Figma project
2. Set canvas to 1200×630 (rectangle)
3. Design using Apex CRM brand guidelines
4. Export as PNG (web optimized)
5. Duplicate and resize to 400×400 for square version

**Adobe Express (Free):**
1. Visit https://www.adobe.com/express/
2. Create → Social Media Post → Custom (1200×630)
3. Add branding elements
4. Download as PNG

**Canva (Free):**
1. Visit https://www.canva.com/
2. Create → Custom size (1200×630)
3. Search "social media" templates
4. Customize with Apex CRM branding
5. Download as PNG

### Option 2: Programmatic Generation (Advanced)

Using Next.js Image Generation API (requires setup):

```tsx
// app/og.tsx
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 128,
          background: '#FAFAF9',
          width: '1200px',
          height: '630px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#2B5F4A',
          fontWeight: 'bold',
        }}
      >
        Apex CRM
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
```

Then reference in metadata:
```tsx
openGraph: {
  images: [
    {
      url: `${appUrl}/api/og`,
      width: 1200,
      height: 630,
      alt: "Apex CRM",
    },
  ],
}
```

### Option 3: Online Generator

**Design Tools:**
- [Remove.bg BG](https://www.remove.bg/tools/bg) — Quick backgrounds
- [Placeit](https://placeit.net/) — Professional mockups
- [Coolors](https://coolors.co/) — Color palette inspiration

## File Placement

```
apex_fe/
├── public/
│   ├── favicon.ico
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── apple-touch-icon.png
│   ├── og-image.png          ← Rectangle (1200×630)
│   └── og-image-square.png   ← Square (400×400)
└── app/
    └── layout.tsx             ← References images
```

## Testing OG Images

### Online Tools

**1. Facebook Sharing Debugger**
```
URL: https://developers.facebook.com/tools/debug/sharing/
Action:
  1. Paste your domain (apexcrm.com)
  2. Click "Scrape Again"
  3. Check preview shows correct image
```

**2. Twitter Card Validator**
```
URL: https://cards-dev.twitter.com/validator
Action:
  1. Paste your domain
  2. Check "Summary Large Image Card"
  3. Verify image displays
```

**3. LinkedIn Post Inspector**
```
URL: https://www.linkedin.com/post-inspector/
Action:
  1. Enter your domain
  2. Check preview
```

**4. Open Graph Preview (All Platforms)**
```
URL: https://www.opengraphic.io/
Action:
  1. Enter your domain
  2. See live preview
```

### Manual Testing

**LinkedIn:**
1. Go to your domain
2. Copy link from address bar
3. Paste in LinkedIn post
4. Wait 5 seconds
5. Verify preview

**Twitter:**
1. Go to twitter.com
2. Compose tweet
3. Paste your domain link
4. Preview appears
5. Verify image

**Facebook:**
1. Copy link
2. Paste in Facebook post
3. Preview appears immediately
4. Verify image

**Slack:**
1. Copy link
2. Paste in Slack message
3. Preview unfolds
4. Verify image

### Debugging

**Image Not Showing?**

1. **Check file exists:**
   ```bash
   ls -la public/og-image.png
   # Should show file is present
   ```

2. **Verify URL is accessible:**
   ```bash
   curl -I https://apexcrm.com/og-image.png
   # Should return 200 OK
   ```

3. **Check Next.js metadata:**
   ```bash
   # Look at page source for og:image meta tag
   curl https://apexcrm.com | grep og:image
   ```

4. **Clear social platform cache:**
   - Facebook: Use Sharing Debugger "Scrape Again"
   - Twitter: Token count refresh (24 hours)
   - LinkedIn: Post Inspector refresh

**Image Looks Blurry?**

- Check dimensions (1200×630 or 400×400)
- Check file isn't compressed too much
- Use PNG instead of JPG if lossy artifacts appear
- Reduce colors if file is large

**Wrong Image Showing?**

- Clear browser cache (Cmd+Shift+R)
- Check correct file in public/
- Verify layout.tsx references correct path
- Check for duplicate og:image tags (only one should exist)

## Performance Optimization

### Image Size

**Target sizes:**
- Rectangle: 100-200KB
- Square: 50-100KB

**Optimization tools:**
```bash
# ImageOptim (macOS)
open og-image.png  # Automatic optimization

# TinyPNG (online)
https://tinypng.com/

# ImageMagick (CLI)
convert og-image.png -quality 85 og-image-optimized.png
```

### Caching

OG images are cached by platforms:
- **Facebook:** Caches for ~1 week
- **Twitter:** Caches for ~24 hours
- **LinkedIn:** Caches for ~30 days
- **Slack:** Caches for ~1 hour

To force refresh:
- Facebook: Use Sharing Debugger
- Twitter: Append `?t=timestamp` to URL
- LinkedIn: Use Post Inspector
- Slack: Delete and repost link

## Metadata Structure

**Implemented in layout.tsx:**

```tsx
openGraph: {
  title: "Apex CRM",
  description: "Streamline your admissions process...",
  type: "website",
  url: appUrl,
  siteName: "Apex CRM",
  locale: "en_US",
  images: [
    {
      url: `${appUrl}/og-image.png`,
      width: 1200,
      height: 630,
      alt: "Apex CRM - Admissions Pipeline Management",
    },
    {
      url: `${appUrl}/og-image-square.png`,
      width: 400,
      height: 400,
      alt: "Apex CRM Logo",
    },
  ],
}

twitter: {
  card: "summary_large_image",
  title: "Apex CRM",
  description: "Streamline your admissions process...",
  images: [`${appUrl}/og-image.png`],
  creator: "@apexcrm",
  site: "@apexcrm",
}
```

## Dynamic OG Images Per Page

For dashboard pages with dynamic content:

```tsx
// app/dashboard/consultant/page.tsx
export async function generateMetadata(): Promise<Metadata> {
  return {
    openGraph: {
      title: `${consultantName}'s Pipeline — Apex CRM`,
      description: "Your admissions pipeline...",
      images: [
        {
          url: `/api/og?consultant=${consultantId}`,
          width: 1200,
          height: 630,
          alt: `${consultantName}'s Dashboard`,
        },
      ],
    },
  }
}
```

## Checklist

- [ ] Create og-image.png (1200×630)
- [ ] Create og-image-square.png (400×400)
- [ ] Place in public/ directory
- [ ] Verify in layout.tsx metadata
- [ ] Test with Facebook Sharing Debugger
- [ ] Test with Twitter Card Validator
- [ ] Test with LinkedIn Post Inspector
- [ ] Test manual sharing on 3+ platforms
- [ ] Verify image displays correctly
- [ ] Check file sizes (<200KB, <100KB)
- [ ] Optimize images for web
- [ ] Document custom OG images per route

## References

- [Open Graph Protocol](https://ogp.me/)
- [Twitter Cards Docs](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/sharing/)
- [Next.js Metadata](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)
