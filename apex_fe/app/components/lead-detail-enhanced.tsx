'use client'

/**
 * Enhanced document list and upload form with audit logging and progress tracking.
 * This file contains improvements to be integrated into lead-detail.tsx:
 * - Document access logging (audit trail)
 * - Upload progress indicator
 * - Better error handling
 */

import { useState, useCallback } from 'react'
import { logDocumentAccess } from '@/app/status/audit-actions'
import type { DocumentRow, UploadProgress } from '@/app/status/types'
import { INITIAL_UPLOAD_PROGRESS } from '@/app/status/types'

/**
 * Enhanced DocumentList with access logging
 * Logs each document view/download for audit trail
 */
export function DocumentListEnhanced({
  documents,
  leadId,
}: {
  documents: DocumentRow[]
  leadId:    string
}) {
  const [logging, setLogging] = useState<Set<string>>(new Set())

  const handleDocumentAccess = useCallback(
    async (doc: DocumentRow, action: 'viewed' | 'downloaded') => {
      setLogging((prev) => new Set(prev).add(doc.id))
      
      try {
        await logDocumentAccess(doc.id, leadId, action)
      } catch (err) {
        console.error(`Failed to log document ${action}:`, err)
        // Silently fail — don't block user from accessing document
      } finally {
        setLogging((prev) => {
          const next = new Set(prev)
          next.delete(doc.id)
          return next
        })
      }
    },
    [leadId]
  )

  if (documents.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">No documents uploaded yet.</p>
  }

  return (
    <ul className="divide-y divide-[var(--border)]" aria-label="Your uploaded documents">
      {documents.map((doc) => (
        <li key={doc.id} className="py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <a
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block truncate text-sm font-medium text-[var(--accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                onClick={() => handleDocumentAccess(doc, 'downloaded')}
                aria-label={`Download ${doc.file_name}`}
              >
                {doc.file_name}
              </a>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Uploaded{' '}
                {new Date(doc.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
              {doc.status === 'rejected' && doc.rejection_reason && (
                <p className="mt-1 text-xs text-[var(--destructive)]">
                  <span className="font-medium">Reason: </span>
                  {doc.rejection_reason}
                </p>
              )}
            </div>
            <div className="shrink-0">
              <DocStatusBadge status={doc.status} />
              {logging.has(doc.id) && (
                <div className="mt-1 text-xs text-[var(--text-muted)]">
                  Logging access…
                </div>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * Document status badge (reused from original)
 */
export function DocStatusBadge({ status }: { status: DocumentRow['status'] }) {
  const styles: Record<DocumentRow['status'], string> = {
    pending:  'bg-[var(--background)] text-[var(--text-muted)] border border-[var(--border)]',
    approved: 'bg-[var(--accent)] text-white',
    rejected: 'bg-[var(--destructive)] text-white',
  }
  const labels: Record<DocumentRow['status'], string> = {
    pending:  'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
  }
  return (
    <span className={`inline-block rounded-[var(--radius-pill)] px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

/**
 * Upload progress indicator component
 * Shows file name, progress bar, and upload status
 */
export function UploadProgressIndicator({
  progress,
}: {
  progress: UploadProgress
}) {
  if (!progress.isUploading) {
    return null
  }

  const percentComplete = progress.total > 0
    ? Math.round((progress.loaded / progress.total) * 100)
    : 0

  const sizeDisplay = formatBytes(progress.loaded, progress.total)

  return (
    <div className="space-y-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)] p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--text)]">
          Uploading…
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          {percentComplete}%
        </p>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-[var(--radius-sm)] bg-[var(--border)]">
        <div
          className="h-full bg-[var(--accent)] transition-all"
          style={{ width: `${percentComplete}%` }}
          role="progressbar"
          aria-valuenow={percentComplete}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Upload progress"
        />
      </div>

      {/* Size info */}
      <p className="text-xs text-[var(--text-muted)]">
        {sizeDisplay}
      </p>
    </div>
  )
}

/**
 * Format bytes for display
 * e.g., "2.3 MB / 5.1 MB"
 */
function formatBytes(loaded: number, total: number): string {
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  const loadedStr = formatSize(loaded)
  const totalStr = formatSize(total)

  return `${loadedStr} / ${totalStr}`
}
