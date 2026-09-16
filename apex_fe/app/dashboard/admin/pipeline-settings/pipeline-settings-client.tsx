'use client'

/**
 * PipelineSettingsClient
 *
 * Renders the six pipeline stage rows with:
 *  - Inline-editable label (text input)
 *  - Inline-editable stall_threshold_hours (number input, min 1)
 *
 * Auto-save on blur: when focus leaves a field the form is submitted
 * programmatically. A brief "Saved ✓" confirmation appears next to the
 * field for 2 s, then clears. No separate save button.
 *
 * Each field is an independent form so saves don't interfere with each other.
 */

import { useActionState, useRef, useEffect, useState, useCallback } from 'react'
import { updateStageLabel, updateStallThreshold } from './actions'
import type { PipelineStageRow, SaveFieldState } from '../types'
import { INITIAL_SAVE_FIELD_STATE } from '../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const inputCls =
  'w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-white px-2 py-1.5 ' +
  'text-sm text-[var(--text)] transition-colors ' +
  'focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] ' +
  'disabled:opacity-50'

/** Mini status indicator shown to the right of a field. */
function FieldStatus({
  fieldKey,
  state,
}: {
  fieldKey: string
  state:    SaveFieldState
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (state.status === 'saved' && state.field === fieldKey) {
      setVisible(true)
      const t = setTimeout(() => setVisible(false), 2000)
      return () => clearTimeout(t)
    }
    // reset if a new save starts
    if (state.status === 'idle') setVisible(false)
  }, [state, fieldKey])

  if (state.status === 'error' && state.field === fieldKey) {
    return (
      <span role="alert" className="whitespace-nowrap text-xs text-[var(--destructive)]">
        {state.message}
      </span>
    )
  }

  if (visible) {
    return (
      <span role="status" className="whitespace-nowrap text-xs font-medium text-[var(--accent)]">
        Saved ✓
      </span>
    )
  }

  return null
}

// ---------------------------------------------------------------------------
// LabelField — inline-editable label for one stage
// ---------------------------------------------------------------------------

function LabelField({ row }: { row: PipelineStageRow }) {
  const [state, action, pending] = useActionState<SaveFieldState, FormData>(
    updateStageLabel,
    INITIAL_SAVE_FIELD_STATE,
  )
  const formRef  = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fieldKey = `label:${row.stage}`

  // Track local value so we can detect actual changes before submitting
  const [value, setValue] = useState(row.label)

  const handleBlur = useCallback(() => {
    if (value.trim() === row.label) return   // nothing changed — skip network round-trip
    formRef.current?.requestSubmit()
  }, [value, row.label])

  return (
    <form ref={formRef} action={action} className="flex items-center gap-2">
      <input type="hidden" name="stage" value={row.stage} />
      <input
        ref={inputRef}
        type="text"
        name="label"
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={handleBlur}
        disabled={pending}
        maxLength={60}
        aria-label={`Label for ${row.stage} stage`}
        className={inputCls}
      />
      <FieldStatus fieldKey={fieldKey} state={state} />
    </form>
  )
}

// ---------------------------------------------------------------------------
// ThresholdField — inline-editable stall_threshold_hours for one stage
// ---------------------------------------------------------------------------

function ThresholdField({ row }: { row: PipelineStageRow }) {
  const [state, action, pending] = useActionState<SaveFieldState, FormData>(
    updateStallThreshold,
    INITIAL_SAVE_FIELD_STATE,
  )
  const formRef  = useRef<HTMLFormElement>(null)
  const fieldKey = `threshold:${row.stage}`

  const [value, setValue] = useState(String(row.stall_threshold_hours))

  const handleBlur = useCallback(() => {
    const parsed = parseInt(value, 10)
    if (!isNaN(parsed) && parsed === row.stall_threshold_hours) return  // no change
    formRef.current?.requestSubmit()
  }, [value, row.stall_threshold_hours])

  return (
    <form ref={formRef} action={action} className="flex items-center gap-2">
      <input type="hidden" name="stage" value={row.stage} />
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          name="stall_threshold_hours"
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={handleBlur}
          disabled={pending}
          min={1}
          step={1}
          aria-label={`Stall threshold hours for ${row.stage} stage`}
          className={`${inputCls} w-24`}
        />
        <span className="shrink-0 text-xs text-[var(--text-muted)]">hrs</span>
      </div>
      <FieldStatus fieldKey={fieldKey} state={state} />
    </form>
  )
}

// ---------------------------------------------------------------------------
// PipelineSettingsClient — main export
// ---------------------------------------------------------------------------

export function PipelineSettingsClient({ stages }: { stages: PipelineStageRow[] }) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-white text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            <th className="w-8 px-4 py-3">#</th>
            <th className="px-4 py-3">Stage key</th>
            <th className="px-4 py-3">Display label</th>
            <th className="px-4 py-3">Stall threshold</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {stages.map(row => (
            <tr key={row.stage} className="hover:bg-[var(--background)]">
              {/* Sort order */}
              <td className="px-4 py-3 text-[var(--text-muted)]">{row.sort_order}</td>

              {/* Stage key — read-only identifier */}
              <td className="px-4 py-3">
                <code className="rounded bg-[var(--background)] px-1.5 py-0.5 text-xs text-[var(--text-muted)]">
                  {row.stage}
                </code>
              </td>

              {/* Editable label */}
              <td className="px-4 py-3">
                <LabelField row={row} />
              </td>

              {/* Editable stall threshold */}
              <td className="px-4 py-3">
                <ThresholdField row={row} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
