'use client';

import Image from 'next/image';
import { useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'scale-down';
  objectPosition?: string;
  sizes?: string;
  onLoad?: () => void;
}

/**
 * OptimizedImage Component
 * 
 * Wrapper around Next.js Image component with automatic optimization:
 * - Responsive sizing with srcset
 * - Lazy loading (except priority images)
 * - WebP format with fallback
 * - Blur placeholder support
 * - Loading state feedback
 * - Error handling with fallback
 * 
 * Usage:
 * ```tsx
 * <OptimizedImage
 *   src="/profile.jpg"
 *   alt="User profile"
 *   width={400}
 *   height={400}
 *   priority={false}
 *   className="rounded-full"
 * />
 * ```
 */
export function OptimizedImage({
  src,
  alt,
  width = 600,
  height = 400,
  priority = false,
  className = '',
  objectFit = 'cover',
  objectPosition = 'center',
  sizes,
  onLoad,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(!priority);
  const [hasError, setHasError] = useState(false);

  // Determine responsive sizes if not provided
  const responsiveSizes =
    sizes ||
    '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';

  return (
    <div className={`relative bg-[var(--background)] ${className}`}>
      {hasError ? (
        // Fallback UI for image load failure
        <div className="flex items-center justify-center w-full h-full bg-[var(--background)] text-[var(--text-muted)]">
          <svg
            className="w-12 h-12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </div>
      ) : (
        <>
          {/* Loading state */}
          {isLoading && (
            <div className="absolute inset-0 bg-[var(--background)] animate-pulse z-10" />
          )}

          {/* Optimized image */}
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            priority={priority}
            loading={priority ? 'eager' : 'lazy'}
            quality={75}
            sizes={responsiveSizes}
            style={{
              objectFit,
              objectPosition,
            }}
            className={`w-full h-full ${
              isLoading ? 'blur-sm' : 'blur-0'
            } transition-all duration-300`}
            onLoadingComplete={() => {
              setIsLoading(false);
              onLoad?.();
            }}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />
        </>
      )}
    </div>
  );
}

/**
 * Avatar Component
 * Optimized for small, circular user profile images
 */
export function OptimizedAvatar({
  src,
  alt,
  size = 'md',
  className = '',
}: {
  src: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeMap = {
    sm: 32,
    md: 48,
    lg: 64,
  };

  const sizePixels = sizeMap[size];

  return (
    <div
      className={`relative flex-shrink-0 rounded-full overflow-hidden bg-[var(--border)] ${className}`}
      style={{ width: sizePixels, height: sizePixels }}
    >
      <OptimizedImage
        src={src}
        alt={alt}
        width={sizePixels}
        height={sizePixels}
        priority={false}
        sizes={`${sizePixels}px`}
      />
    </div>
  );
}

/**
 * Background Image Component
 * For hero images and large backgrounds with optimal performance
 */
export function OptimizedBackgroundImage({
  src,
  alt,
  children,
  className = '',
}: {
  src: string;
  alt: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        priority
        quality={60}
        sizes="100vw"
        style={{
          objectFit: 'cover',
          objectPosition: 'center',
        }}
        className="absolute inset-0"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/**
 * Thumbnail Component
 * For smaller preview images with blur placeholder
 */
export function OptimizedThumbnail({
  src,
  alt,
  width = 160,
  height = 160,
  className = '',
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  return (
    <div className={`relative rounded-md overflow-hidden bg-[var(--border)] ${className}`}>
      <OptimizedImage
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={false}
        sizes="(max-width: 768px) 120px, 160px"
      />
    </div>
  );
}
