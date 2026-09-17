/**
 * Pagination Utilities
 * Phase 10 LOW #16: Implement pagination for admin list queries
 *
 * Provides standardized pagination for large lists with:
 * - Cursor-based pagination (preferred for real-time data)
 * - Offset-based pagination (simpler, works with all databases)
 * - Total count estimation
 * - URL parameter integration with next/navigation
 */

/**
 * Pagination configuration
 */
export interface PaginationConfig {
  pageSize: number
  maxPageSize?: number // Prevent abuse (default 100)
}

export interface PaginationParams {
  page?: string | number
  limit?: string | number
  offset?: string | number
  cursor?: string
}

export interface PaginationResult<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
    offset: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
    nextPage?: number
    previousPage?: number
  }
}

/**
 * Cursor-based pagination for real-time data
 * Better for live updates (doesn't show duplicates if items are added/removed)
 */
export interface CursorPaginationResult<T> {
  items: T[]
  cursor: {
    currentCursor: string | null
    nextCursor: string | null
    hasPreviousPage: boolean
    hasNextPage: boolean
  }
}

/**
 * Defaults for common list sizes
 */
export const PAGINATION_PRESETS = {
  ADMIN_LEADS: { pageSize: 25 }, // Admin lead list
  ADMIN_CONSULTANTS: { pageSize: 20 }, // Team management
  ADMIN_ANALYTICS: { pageSize: 50 }, // Analytics details
  DOCUMENTS: { pageSize: 15 }, // Document list
  COMMUNICATIONS: { pageSize: 30 }, // Communication history
  ACTIVITY_LOG: { pageSize: 50 }, // Audit log
} as const

/**
 * Parse pagination parameters from URL query string
 * Returns normalized values with defaults
 */
export function parsePaginationParams(
  params: PaginationParams,
  config: PaginationConfig
): {
  page: number
  limit: number
  offset: number
} {
  const limit = Math.min(
    Number(params.limit) || config.pageSize,
    config.maxPageSize || 100
  )

  const page = Math.max(1, Number(params.page) || 1)
  const offset = Number(params.offset) || (page - 1) * limit

  return { page, limit, offset }
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
  offset: number,
  limit: number,
  total: number
): PaginationResult<any>['pagination'] {
  const page = Math.floor(offset / limit) + 1
  const totalPages = Math.ceil(total / limit)

  return {
    page,
    limit,
    offset,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    nextPage: page < totalPages ? page + 1 : undefined,
    previousPage: page > 1 ? page - 1 : undefined,
  }
}

/**
 * Format pagination result
 */
export function formatPaginationResult<T>(
  items: T[],
  offset: number,
  limit: number,
  total: number
): PaginationResult<T> {
  const pagination = calculatePagination(offset, limit, total)

  return {
    items,
    pagination,
  }
}

/**
 * Generate pagination URL query string
 */
export function generatePaginationUrl(
  page: number,
  limit: number,
  baseParams?: Record<string, string>
): URLSearchParams {
  const params = new URLSearchParams()

  // Add base params if provided
  if (baseParams) {
    Object.entries(baseParams).forEach(([key, value]) => {
      params.set(key, value)
    })
  }

  // Add pagination params
  params.set('page', String(page))
  params.set('limit', String(limit))

  return params
}

/**
 * Create pagination links for navigation
 */
export function createPaginationLinks(
  baseUrl: string,
  page: number,
  limit: number,
  totalPages: number,
  baseParams?: Record<string, string>
) {
  const createUrl = (p: number) => {
    const params = generatePaginationUrl(p, limit, baseParams)
    return `${baseUrl}?${params.toString()}`
  }

  return {
    first: createUrl(1),
    last: createUrl(totalPages),
    next: page < totalPages ? createUrl(page + 1) : null,
    previous: page > 1 ? createUrl(page - 1) : null,
    current: createUrl(page),
  }
}

/**
 * Estimate total for very large lists (sample-based)
 * Useful for millions of rows where count(*) is expensive
 *
 * For CRM: probably not needed, but included for completeness
 */
export function estimateTotalFromSample(
  sampleSize: number,
  resultsFound: number,
  estimatedDensity: number = 0.8
): number {
  return Math.ceil((resultsFound / sampleSize) / estimatedDensity)
}

/**
 * Validate pagination parameters
 * Returns { isValid, error, corrected }
 */
export function validatePaginationParams(
  page: number,
  limit: number,
  total: number,
  maxPageSize: number = 100
): {
  isValid: boolean
  error?: string
  corrected?: { page: number; limit: number }
} {
  if (page < 1) {
    return {
      isValid: false,
      error: 'Page must be >= 1',
      corrected: { page: 1, limit },
    }
  }

  if (limit < 1) {
    return {
      isValid: false,
      error: 'Limit must be >= 1',
      corrected: { page, limit: 10 },
    }
  }

  if (limit > maxPageSize) {
    return {
      isValid: false,
      error: `Limit cannot exceed ${maxPageSize}`,
      corrected: { page, limit: maxPageSize },
    }
  }

  const totalPages = Math.ceil(total / limit)
  if (page > totalPages && total > 0) {
    return {
      isValid: false,
      error: `Page ${page} exceeds total pages ${totalPages}`,
      corrected: { page: totalPages, limit },
    }
  }

  return { isValid: true }
}

/**
 * Server-side pagination helper for Supabase queries
 * Returns query builder with range applied
 *
 * @example
 * const { from, to } = applySupabasePagination(
 *   supabase.from('leads'),
 *   offset,
 *   limit
 * )
 * // Now chain .range(from, to) for offset-based pagination
 */
export function applySupabasePagination(
  query: any,
  offset: number,
  limit: number
): any {
  // Supabase .range(from, to) is inclusive on both ends
  // So for offset-based: .range(offset, offset + limit - 1)
  const from = offset
  const to = offset + limit - 1

  return query.range(from, to)
}

/**
 * Generate rel links for HTTP pagination (REST API pattern)
 * Used for Link header in responses
 *
 * @example
 * const linkHeader = generateLinkHeader(
 *   'https://api.example.com/leads',
 *   page,
 *   limit,
 *   totalPages
 * )
 * // Link: <...?page=2>; rel="next", <...?page=1>; rel="prev"
 */
export function generateLinkHeader(
  baseUrl: string,
  page: number,
  limit: number,
  totalPages: number
): string | null {
  const links: string[] = []

  if (page < totalPages) {
    const nextUrl = `${baseUrl}?page=${page + 1}&limit=${limit}`
    links.push(`<${nextUrl}>; rel="next"`)
  }

  if (page > 1) {
    const prevUrl = `${baseUrl}?page=${page - 1}&limit=${limit}`
    links.push(`<${prevUrl}>; rel="prev"`)
  }

  if (links.length === 0) return null

  return links.join(', ')
}

/**
 * Generate pagination HTML for templates
 * (If needed for server-rendered pages)
 */
export function generatePaginationHTML(
  page: number,
  totalPages: number,
  baseUrl: string,
  maxLinks: number = 5
): string {
  const links: string[] = []

  // Previous button
  if (page > 1) {
    links.push(`<a href="${baseUrl}?page=${page - 1}">← Previous</a>`)
  }

  // Page numbers
  let startPage = Math.max(1, page - Math.floor(maxLinks / 2))
  let endPage = Math.min(totalPages, startPage + maxLinks - 1)
  startPage = Math.max(1, endPage - maxLinks + 1)

  for (let i = startPage; i <= endPage; i++) {
    if (i === page) {
      links.push(`<span class="current">${i}</span>`)
    } else {
      links.push(`<a href="${baseUrl}?page=${i}">${i}</a>`)
    }
  }

  // Next button
  if (page < totalPages) {
    links.push(`<a href="${baseUrl}?page=${page + 1}">Next →</a>`)
  }

  return `<nav class="pagination">${links.join('')}</nav>`
}

/**
 * React hook for pagination state (if needed in components)
 * Note: This is a placeholder; actual implementation would use hooks
 */
export function usePagination(
  initialPage: number = 1,
  pageSize: number = 25
) {
  // In a real implementation, this would use useState/useRouter
  return {
    page: initialPage,
    pageSize,
    setPage: (page: number) => {
      // Update URL and state
    },
  }
}

/**
 * Export common presets for convenience
 */
export const DEFAULT_PAGE_SIZE = 25
export const MAX_PAGE_SIZE = 100
