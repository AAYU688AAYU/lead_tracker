/**
 * Content Sanitization Utilities
 * Phase 10: Prevent XSS attacks by sanitizing user-generated content
 *
 * Uses DOMPurify for safe HTML sanitization
 */

/**
 * Sanitize HTML content with strict allowlist
 *
 * Only allows:
 * - Text content
 * - Basic formatting: <b>, <i>, <em>, <strong>
 * - Line breaks: <br>
 * - Lists: <ul>, <ol>, <li>
 * - Paragraphs: <p>
 *
 * Blocks:
 * - Scripts
 * - Event handlers
 * - External content (iframes, images)
 * - Links with javascript: protocol
 * - Data attributes
 */
export function sanitizeHtml(html: string): string {
  // If DOMPurify is not available (SSR context), return plain text
  if (typeof window === 'undefined') {
    return sanitizePlainText(html)
  }

  try {
    // Dynamic import to avoid SSR issues
    const DOMPurify = require('dompurify').default

    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true, // Keep text content if all HTML is stripped
      RETURN_DOM: false,
      FORCE_BODY: false,
    })
  } catch (err) {
    console.warn('[sanitizeHtml] DOMPurify error, falling back to plain text:', err)
    return sanitizePlainText(html)
  }
}

/**
 * Plain text sanitization (fallback)
 * Removes all HTML tags and entities
 */
export function sanitizePlainText(text: string): string {
  if (!text) return ''

  // Remove any HTML tags
  let cleaned = text.replace(/<[^>]*>/g, '')

  // Decode HTML entities
  const textarea = typeof document !== 'undefined' ? document.createElement('textarea') : null
  if (textarea) {
    textarea.innerHTML = cleaned
    cleaned = textarea.value
  }

  return cleaned
}

/**
 * Sanitize user input before storage
 * Removes potentially harmful content while preserving intent
 */
export function sanitizeUserInput(input: string, maxLength: number = 5000): string {
  if (!input) return ''

  // Trim whitespace
  let cleaned = input.trim()

  // Enforce max length
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength)
  }

  // Remove null bytes
  cleaned = cleaned.replace(/\0/g, '')

  // Remove control characters (except newlines and tabs)
  cleaned = cleaned.replace(/[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]/g, '')

  return cleaned
}

/**
 * Escape HTML special characters
 * Converts user text to safe HTML
 */
export function escapeHtml(text: string): string {
  if (!text) return ''

  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }

  return text.replace(/[&<>"']/g, (char) => map[char])
}

/**
 * Format user text for display
 * Converts newlines to <br> and preserves basic structure
 */
export function formatUserText(text: string): string {
  if (!text) return ''

  // First escape HTML
  let formatted = escapeHtml(text)

  // Convert newlines to <br>
  formatted = formatted.replace(/\n/g, '<br>')

  // Convert multiple spaces to &nbsp;
  formatted = formatted.replace(/  +/g, (match) => {
    return '&nbsp;'.repeat(match.length - 1) + ' '
  })

  return formatted
}

/**
 * React hook for safely rendering user content
 * Returns dangerouslySetInnerHTML object or null
 */
export function useSafeHtml(html: string | null | undefined): { __html: string } | null {
  if (!html) return null

  try {
    const sanitized = sanitizeHtml(html)
    return { __html: sanitized }
  } catch (err) {
    console.error('[useSafeHtml] Sanitization error:', err)
    return null
  }
}
