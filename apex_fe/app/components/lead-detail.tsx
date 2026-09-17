'use client'

/**
 * Shared lead-detail components used by both:
 *   - /dashboard/student  (authenticated, embedded per-lead panel)
 *   - /status             (public lookup result view)
 *
 * Exports:
 *   PipelineStepper  — vertical stepper for all 6 stages
 *   MiniStepper      — compact horizontal progress bar for dashboard table rows
 *   DocStatusBadge   — pending / approved / rejected pill
 *   DocumentList     — list of uploaded documents with rejection reason
 *   UploadForm       — file picker + server action upload
 *   LeadDetailPanel  — full panel: stepper + last contacted + upload + doc list
 */

import { useActionState, useState, useRef, useEffect, useCallback } from 'react'
import { uploadDocument } from '@/app/status/actions'
import { INITIAL_UPLOAD_STATE } from '@/app/status/types'
import type { UploadState, DocumentRow, StageStep } from '@/app/status/types'

// ---------------------------------------------------------------------------
// PipelineStepper — vertical, used in the full detail panel
// ---------------------------------------------------------------------------

export function PipelineStepper({
  stages,
  currentStage,
  leadStatus,
}: {
  stages:       StageStep[]
  currentStage: string
  leadStatus:   string
}) {
  const currentOrder = stages.find((s) => s.stage === currentStage)?.sort_order ?? 0
  const isStalled    = leadStatus === 'stalled'
  const isTerminal   = leadStatus === 'completed' || leadStatus === 'dropped'

  return (
    <ol aria-label="Application pipeline" className="relative space-y-0">
      {stages.map((step, idx) => {
        const isLast    = idx === stages.length - 1
        const isCurrent = step.stage === currentStage
        const isDone    = step.sort_order < currentOrder
        const isFuture  = step.sort_order > currentOrder

        const dotBg     = isDone    ? 'bg-[var(--accent)]'
                        : isCurrent ? (isStalled ? 'bg-[var(--stalled)]' : 'bg-[var(--accent)]')
                        : ''
        const lineColor = isDone    ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
        const labelColor = isCurrent
          ? (isStalled ? 'text-[var(--stalled)] font-semibold' : 'text-[var(--accent)] font-semibold')
          : 'text-[var(--text-muted)]'

        return (
          <li
            key={step.stage}
            className="relative flex gap-4"
            aria-current={isCurrent ? 'step' : undefined}
          >
            {/* Vertical connector */}
            {!isLast && (
              <span
                aria-hidden
                className={`absolute left-[11px] top-6 h-full w-0.5 ${lineColor}`}
              />
            )}

            {/* Dot */}
            <span className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-pill)]">
              {isDone ? (
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-[var(--radius-pill)] ${dotBg}`}
                  aria-hidden
                >
                  <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              ) : isCurrent ? (
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-[var(--radius-pill)] ring-2 ring-offset-2 ${
                    isStalled
                      ? 'bg-[var(--stalled)] ring-[var(--stalled)]'
                      : 'bg-[var(--accent)] ring-[var(--accent)]'
                  }`}
                  aria-hidden
                >
                  <span className="h-2 w-2 rounded-[var(--radius-pill)] bg-white" />
                </span>
              ) : (
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-pill)] border-2 border-[var(--border)] bg-white"
                  aria-hidden
                />
              )}
            </span>

            {/* Label */}
            <div className="pb-7 pt-0.5">
              <p className={`text-sm ${labelColor}`}>
                {step.label}
                {isCurrent && isStalled && (
                  <span className="ml-2 text-xs font-normal text-[var(--stalled)]">(stalled)</span>
                )}
                {isCurrent && isTerminal && (
                  <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">({leadStatus})</span>
                )}
              </p>
              {isCurrent && !isFuture && (
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">Current stage</p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

// ---------------------------------------------------------------------------
// MiniStepper — compact horizontal dots for dashboard table rows
// ---------------------------------------------------------------------------

export function MiniStepper({
  stages,
  currentStage,
  leadStatus,
}: {
  stages:       StageStep[]
  currentStage: string
  leadStatus:   string
}) {
  const currentOrder = stages.find((s) => s.stage === currentStage)?.sort_order ?? 0
  const isStalled    = leadStatus === 'stalled'

  return (
    <div className="flex items-center gap-1" aria-label={`Pipeline progress: ${currentStage}`}>
      {stages.map((step) => {
        const isCurrent = step.stage === currentStage
        const isDone    = step.sort_order < currentOrder

        const color = isDone    ? 'bg-[var(--accent)]'
                    : isCurrent ? (isStalled ? 'bg-[var(--stalled)]' : 'bg-[var(--accent)]')
                    : 'bg-[var(--border)]'

        const size = isCurrent ? 'h-2.5 w-2.5' : 'h-2 w-2'

        return (
          <span
            key={step.stage}
            aria-hidden
            className={`rounded-[var(--radius-pill)] ${color} ${size} shrink-0`}
            title={step.label}
          />
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// DocStatusBadge
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// DocumentList
// ---------------------------------------------------------------------------

export function DocumentList({ documents }: { documents: DocumentRow[] }) {
  if (documents.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">No documents uploaded yet.</p>
  }

  return (
    <ul className="divide-y divide-[var(--border)]" aria-label="Your uploaded documents">
      {documents.map((doc) => (
        <li key={doc.id} className="py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--text)]">{doc.file_name}</p>
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
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

// ---------------------------------------------------------------------------
// UploadForm
// ---------------------------------------------------------------------------

const ALLOWED_TYPES  = ['application/pdf', 'image/jpeg', 'image/png']
const ALLOWED_ACCEPT = '.pdf,.jpg,.jpeg,.png'
const MAX_BYTES      = 10 * 1024 * 1024

export function UploadForm({
  leadId,
  studentId,
  onSuccess,
  // Allow callers to namespace the file input id so multiple panels
  // on the same page don't share an id (dashboard has one panel per lead).
  inputId = 'file',
}: {
  leadId:    string
  studentId: string
  onSuccess: (doc: DocumentRow) => void
  inputId?:  string
}) {
  const [uploadState, uploadAction, uploadPending] = useActionState<UploadState, FormData>(
    uploadDocument,
    INITIAL_UPLOAD_STATE,
  )
  const [clientError,   setClientError]   = useState<string | null>(null)
  const [selectedFile,  setSelectedFile]  = useState<string>('')
  const fileInputRef   = useRef<HTMLInputElement>(null)
  // Track the document id we already reported to onSuccess so the effect
  // never fires more than once for the same upload, regardless of re-renders.
  const reportedDocId  = useRef<string | null>(null)

  useEffect(() => {
    if (
      uploadState.status === 'success' &&
      uploadState.document.id !== reportedDocId.current
    ) {
      reportedDocId.current = uploadState.document.id
      onSuccess(uploadState.document)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setSelectedFile('')
      setClientError(null)
    }
  }, [uploadState, onSuccess])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setClientError(null)
    setSelectedFile('')
    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      setClientError('Only PDF, JPG, and PNG files are accepted.')
      e.target.value = ''
      return
    }
    if (file.size > MAX_BYTES) {
      setClientError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.`)
      e.target.value = ''
      return
    }
    setSelectedFile(file.name)
  }

  const errorToShow = clientError ?? (uploadState.status === 'error' ? uploadState.message : null)

  return (
    <div>
      {uploadState.status === 'success' && (
        <div role="status" aria-live="polite"
          className="mb-4 flex items-start gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--text-muted)]">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
          </svg>
          <span>
            <span className="font-medium text-[var(--text)]">{uploadState.document.file_name}</span>
            {' '}uploaded successfully and is pending review.
          </span>
        </div>
      )}

      {errorToShow && (
        <div role="alert" aria-live="polite"
          className="mb-4 rounded-[var(--radius-sm)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-[var(--destructive)]">
          {errorToShow}
        </div>
      )}

      <form action={uploadAction} noValidate>
        <input type="hidden" name="lead_id"    value={leadId} />
        <input type="hidden" name="student_id" value={studentId} />

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label htmlFor={inputId} className="block text-sm font-medium text-[var(--text)]">
              Upload document
            </label>
            <div className="relative mt-1">
              <input
                ref={fileInputRef}
                id={inputId}
                name="file"
                type="file"
                accept={ALLOWED_ACCEPT}
                required
                disabled={uploadPending}
                onChange={handleFileChange}
                className="sr-only"
                aria-describedby={`${inputId}-hint`}
              />
              <label
                htmlFor={inputId}
                className={[
                  'flex w-full cursor-pointer items-center gap-2 rounded-[var(--radius-sm)]',
                  'border border-dashed border-[var(--border)] bg-white px-3 py-2',
                  'text-sm transition-colors hover:border-[var(--accent)]',
                  uploadPending ? 'pointer-events-none opacity-50' : '',
                ].join(' ')}
              >
                <svg className="h-4 w-4 shrink-0 text-[var(--text-muted)]" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                  <polyline points="16 12 12 8 8 12" />
                  <line x1="12" y1="8" x2="12" y2="20" />
                </svg>
                <span className={selectedFile ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}>
                  {selectedFile || 'Choose file…'}
                </span>
              </label>
            </div>
            <p id={`${inputId}-hint`} className="mt-1 text-xs text-[var(--text-muted)]">
              PDF, JPG, or PNG — max 10 MB
            </p>
          </div>

          <button
            type="submit"
            disabled={uploadPending || !!clientError || !selectedFile}
            className="mb-6 shrink-0 rounded-[var(--radius-sm)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:opacity-50"
          >
            {uploadPending ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------
// LeadDetailPanel — full detail: stepper + last contacted + upload + doc list
// Accepts either a pre-resolved LookupResult (from /status server action) or
// the raw fields the dashboard already has from its own query.
// ---------------------------------------------------------------------------

export interface LeadDetailProps {
  leadId:         string
  studentId:      string
  currentStage:   string
  leadStatus:     string
  stages:         StageStep[]
  lastContacted:  string | null   // ISO timestamp or null
  initialDocs:    DocumentRow[]
  referenceCode?: string          // shown in the dashboard panel header
}

export function LeadDetailPanel({
  leadId,
  studentId,
  currentStage,
  leadStatus,
  stages,
  lastContacted,
  initialDocs,
  referenceCode,
}: LeadDetailProps) {
  const [documents, setDocuments] = useState<DocumentRow[]>(initialDocs)

  // Stable callback — must not be recreated on every render, otherwise
  // UploadForm's useEffect dependency changes every render and fires in a loop.
  const handleUploadSuccess = useCallback((doc: DocumentRow) => {
    setDocuments((prev) => [doc, ...prev])
  }, [])  // setDocuments is stable; no deps needed

  const formattedDate = lastContacted
    ? new Date(lastContacted).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null

  // Unique input id so multiple panels on the same page don't clash
  const uploadInputId = `file-${leadId}`

  return (
    <div className="space-y-5">
      {/* Reference code chip */}
      {referenceCode && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
            Reference
          </span>
          <span className="font-mono text-sm font-bold tracking-widest text-[var(--text)]">
            {referenceCode}
          </span>
        </div>
      )}

      {/* Pipeline stepper */}
      <section aria-labelledby={`pipeline-heading-${leadId}`}>
        <h3
          id={`pipeline-heading-${leadId}`}
          className="mb-4 text-sm font-semibold text-[var(--text)]"
        >
          Application progress
        </h3>
        <PipelineStepper
          stages={stages}
          currentStage={currentStage}
          leadStatus={leadStatus}
        />
        <div className="mt-1 border-t border-[var(--border)] pt-4">
          <p className="text-sm text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text)]">Last contacted:</span>{' '}
            {formattedDate ?? 'No contact logged yet'}
          </p>
        </div>
      </section>

      {/* Document upload + list */}
      <section aria-labelledby={`docs-heading-${leadId}`}>
        <h3
          id={`docs-heading-${leadId}`}
          className="mb-4 text-sm font-semibold text-[var(--text)]"
        >
          Documents
        </h3>
        <UploadForm
          leadId={leadId}
          studentId={studentId}
          onSuccess={handleUploadSuccess}
          inputId={uploadInputId}
        />
        {documents.length > 0 && (
          <div className="mt-4 border-t border-[var(--border)] pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Your uploads
            </p>
            <DocumentList documents={documents} />
          </div>
        )}
      </section>
    </div>
  )
}
