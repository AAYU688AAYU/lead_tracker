# Image Optimization Guide

## Overview

Optimized images are critical for performance. Apex CRM uses Next.js Image component for automatic optimization:
- Responsive image sizing
- Modern format delivery (WebP with fallback)
- Lazy loading by default
- AVIF format on supported browsers
- Automatic quality adjustment

## Performance Impact

### Metrics
- **Page Load Time:** -30-50% with optimized images
- **Core Web Vitals:** Improved CLS, LCP
- **Bandwidth:** -60-80% with WebP/AVIF
- **Mobile Performance:** Critical on 3G networks

### Target Metrics
- Image file size: <100KB for thumbnails, <300KB for full-width
- Lazy load below-fold images: 2s+ delay acceptable
- Priority images (hero): Preload for first paint

## Components

### 1. OptimizedImage

General-purpose image component with loading state.

**Usage:**
```tsx
import { OptimizedImage } from '@/app/components/optimized-image'

export function MyComponent() {
  return (
    <OptimizedImage
      src="/dashboard-hero.jpg"
      alt="Dashboard overview"
      width={1200}
      height={630}
      priority={false}
      className="rounded-lg"
    />
  )
}
```

**Props:**
- `src`: Image URL (string)
- `alt`: Alt text for accessibility
- `width`: Intrinsic width in pixels
- `height`: Intrinsic height in pixels
- `priority`: true for above-fold images (disables lazy loading)
- `className`: Tailwind classes
- `objectFit`: 'contain' | 'cover' | 'fill' | 'scale-down'
- `sizes`: Responsive sizes (auto-generated if omitted)

**Features:**
- Automatic loading state with blur effect
- Error fallback UI
- Lazy loading by default
- WebP format with fallback
- Quality: 75 (optimized for web)

### 2. OptimizedAvatar

Small circular profile images.

**Usage:**
```tsx
import { OptimizedAvatar } from '@/app/components/optimized-image'

export function ConsultantCard({ name, avatarUrl }) {
  return (
    <div className="flex items-center gap-2">
      <OptimizedAvatar
        src={avatarUrl}
        alt={name}
        size="md"
      />
      <span>{name}</span>
    </div>
  )
}
```

**Sizes:**
- `sm`: 32px
- `md`: 48px (default)
- `lg`: 64px

### 3. OptimizedBackgroundImage

Full-width hero and background images.

**Usage:**
```tsx
import { OptimizedBackgroundImage } from '@/app/components/optimized-image'

export function HeroSection() {
  return (
    <OptimizedBackgroundImage
      src="/hero-bg.jpg"
      alt="Admissions hero"
      className="h-96"
    >
      <div className="flex items-center justify-center h-full">
        <h1 className="text-4xl font-bold text-white">Welcome</h1>
      </div>
    </OptimizedBackgroundImage>
  )
}
```

**Features:**
- Uses `fill` for responsive sizing
- Prioritized (preloaded)
- Lower quality (60) for backgrounds
- Positioned as absolute background

### 4. OptimizedThumbnail

Small preview images for thumbnails.

**Usage:**
```tsx
import { OptimizedThumbnail } from '@/app/components/optimized-image'

export function DocumentPreview({ url }) {
  return (
    <OptimizedThumbnail
      src={url}
      alt="Document preview"
      width={160}
      height={160}
    />
  )
}
```

## When to Use

### Use next/image for:
- ✅ Profile pictures
- ✅ Product/item thumbnails
- ✅ Hero images
- ✅ Background images
- ✅ Icons (if large, >24px)
- ✅ Any image that could be different sizes

### Use HTML img for:
- ✅ Tiny icons (<16px)
- ✅ SVGs (use svg import instead)
- ✅ Data URIs (embedded)
- ✅ Animated GIFs (use video instead)

### Use external CDN for:
- ✅ User-uploaded profile pictures
- ✅ Dynamic or frequently changing images
- ✅ Images from third-party services

## Image Formats

### Recommended Formats

**Format Priority:**
1. **AVIF** (best compression, not all browsers)
2. **WebP** (good compression, broad support)
3. **PNG** (lossless, transparency)
4. **JPEG** (lossy, broad support, larger)

**Quality Guidelines:**
- **Quality 75:** Standard web images (photos, screenshots)
- **Quality 60:** Background images, large photos
- **Quality 85+:** Small critical images, text-heavy

### Conversion Tools

**ImageMagick:**
```bash
# Convert to WebP
convert input.jpg -quality 75 output.webp

# Convert to AVIF
convert input.jpg -define webp:method=6 output.avif

# Batch convert
for f in *.jpg; do convert "$f" -quality 75 "${f%.jpg}.webp"; done
```

**Online Tools:**
- Squoosh: https://squoosh.app/ (try all formats)
- TinyPNG: https://tinypng.com/ (PNG/JPG only)
- CloudConvert: https://cloudconvert.com/

## Responsive Images

### Sizes Attribute

`sizes` tells the browser which image size to load:

```tsx
// Mobile: full width, Desktop: 50% width
sizes="(max-width: 768px) 100vw, 50vw"

// Sidebar layout
sizes="(max-width: 768px) 100vw, (max-width: 1024px) 66vw, 33vw"

// Exact pixel sizes
sizes="(max-width: 640px) 300px, 600px"
```

**Common Patterns:**
```tsx
// Full width on mobile, fixed width on desktop
sizes="(max-width: 768px) 100vw, 800px"

// Grid layout: 1 col mobile, 2 col tablet, 3 col desktop
sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"

// Sidebar: main content 70%, sidebar 30%
sizes="(max-width: 768px) 100vw, (max-width: 1280px) 70vw, 800px"
```

## Performance Best Practices

### 1. Prioritize Above-Fold Images

```tsx
// Hero image: prioritize
<OptimizedImage
  src="/hero.jpg"
  alt="Hero"
  priority={true}
/>

// Below fold: lazy load (default)
<OptimizedImage
  src="/thumbnail.jpg"
  alt="Thumbnail"
  priority={false}
/>
```

**Impact:** Priority=true saves ~1-2 seconds on page load.

### 2. Use Correct Dimensions

```tsx
// GOOD: Exact dimensions
<OptimizedImage
  src="/profile.jpg"
  width={400}
  height={400}
  priority={false}
/>

// BAD: Missing dimensions (layout shift)
<OptimizedImage
  src="/profile.jpg"
  width={400}
  height={400}
  className="w-full h-auto"
/>
```

**Impact:** Prevents Cumulative Layout Shift (CLS).

### 3. Lazy Load Below-Fold Content

```tsx
// Above fold (hero section)
<OptimizedImage src="/hero.jpg" priority={true} />

// Below fold (lazy load automatically)
{/* Modal, expanded content, etc */}
<OptimizedImage src="/modal-image.jpg" priority={false} />
```

**Impact:** Improves LCP (Largest Contentful Paint) by ~20%.

### 4. Use Appropriate Quality

```tsx
// High quality for small images
<OptimizedImage src="/logo.png" quality={95} />

// Medium quality for standard photos
<OptimizedImage src="/profile.jpg" quality={75} />

// Lower quality for backgrounds
<OptimizedBackgroundImage src="/bg.jpg" quality={60} />
```

**Quality vs File Size:**
- 95: 100% (lossless, ~100KB)
- 85: 110% (visible loss, ~60KB)
- 75: 80% (good balance, ~40KB)
- 60: 60% (acceptable for backgrounds, ~25KB)

### 5. Optimize at Build Time

**Next.js Image Optimization:**
```bash
# Images are automatically optimized at build time
npm run build

# Check optimized images
ls -la .next/image-optimization/
```

## Troubleshooting

### Image Not Showing

1. **Check src is correct:**
   ```tsx
   // ✅ Correct
   src="/images/profile.jpg"
   
   // ❌ Wrong (relative path)
   src="images/profile.jpg"
   ```

2. **Check dimensions:**
   ```tsx
   // ✅ Both dimensions provided
   width={400} height={300}
   
   // ⚠️ Only width (Next.js will calculate height if unknown)
   width={400}
   ```

3. **Check alt text:**
   ```tsx
   // ✅ Descriptive alt
   alt="User profile picture"
   
   // ⚠️ Generic alt
   alt="image"
   ```

### Slow Image Load

1. **Check priority flag:**
   ```tsx
   // Above fold should have priority={true}
   <OptimizedImage priority={true} />
   
   // Below fold should NOT have priority
   <OptimizedImage priority={false} />
   ```

2. **Check image size:**
   ```bash
   # File should be <300KB
   ls -lh public/images/large-photo.jpg
   # Convert to WebP if larger
   ```

3. **Check network throttling:**
   ```
   DevTools → Network → Throttling
   Test at Slow 3G or Fast 3G
   ```

### Layout Shift

1. **Always specify dimensions:**
   ```tsx
   // ✅ Prevents layout shift
   <OptimizedImage width={600} height={400} />
   
   // ❌ Causes layout shift
   <img src="/image.jpg" />
   ```

2. **Use aspect ratio CSS:**
   ```tsx
   <div className="aspect-video bg-[var(--border)]">
     <OptimizedImage
       src="/video-thumbnail.jpg"
       fill
       objectFit="cover"
     />
   </div>
   ```

### Quality Too Low/High

**Too low (pixelated):**
- Increase quality from 75 to 85
- Increase from 60 to 75

**File too large:**
- Decrease quality from 85 to 75
- Decrease from 75 to 60
- Convert to WebP format

## Integration Checklist

When adding images to a page:

- [ ] Use OptimizedImage or Next.js Image
- [ ] Specify width and height props
- [ ] Set priority={true} for above-fold only
- [ ] Provide descriptive alt text
- [ ] Use appropriate sizes for responsive layout
- [ ] Verify image loads on mobile (DevTools throttle)
- [ ] Check file size (<300KB for content images)
- [ ] Check quality looks good (no artifacting)
- [ ] Verify no layout shift (CLS metric)
- [ ] Test on 3G network speed

## Performance Baseline

After optimization, target these metrics:

| Metric | Target |
|--------|--------|
| LCP (Largest Contentful Paint) | <2.5s |
| CLS (Cumulative Layout Shift) | <0.1 |
| Image File Size (photo) | <200KB |
| Image File Size (thumbnail) | <50KB |
| Images per page (avg) | <5 above-fold |
| Images per page (total) | <20 total |

## References

- [Next.js Image Optimization](https://nextjs.org/docs/basic-features/image-optimization)
- [Web.dev: Image Optimization](https://web.dev/use-images-effectively/)
- [AVIF Format Guide](https://jakearchibald.com/avif/)
- [WebP Format Guide](https://developers.google.com/speed/webp)
- [Core Web Vitals Guide](https://web.dev/vitals/)
