'use client'

/**
 * PipelineSettingsClient
 *
 * Renders the six pipeline stage rows with:
 *  - Inline-editable label (text input)
 *  - Inline-editable stall_threshold_hours (number input, min 1)
 *  - Inline-editable escalation_threshold_hours (number input, min 1) — TASK #8
 *  - Inline-editable severity_level (dropdown) — TASK #9
 *
 * Auto-save on blur: when focus leaves a field the form is submitted
 * programmatically. A brief "Saved ✓" confirmation appears next to the
 * field for 2 s, then clears. No separate save button.
 *
 * Each field is an independent form so saves don't interfere with each other.
 */

import { useActionState, useRef, useEffect, useState, useCallback } from 'react'
import { updateStageLabel, updateStallThreshold, updateEscalationThreshold, updateSeverityLevel } from './actions'
import type { PipelineStageRow, SaveFieldState } from '../types'
import { INITIAL_SAVE_FIELD_STATE } from '../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const inputCls =
  'w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-white px-2 py-1.5 ' +
  'text-sm text-[var(--text)] transition-colors ' +
  'focus-visible:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] ' +
  'disabled:opacity-50'

// ---------------------------------------------------------------------------
// FieldStatus — Mini status indicator with save state styling
// ---------------------------------------------------------------------------

function FieldStatus({
  fieldKey,
  state,
  showBorder = false,
}: {
  fieldKey: string
  state: SaveFieldState
  showBorder?: boolean
}) {
  const [visible, setVisible] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    if (state.status === 'saved' && state.field === fieldKey) {
      setIsSaved(true)
      setVisible(true)
      const t = setTimeout(() => {
        setVisible(false)
        setIsSaved(false)
      }, 2000)
      return () => clearTimeout(t)
    }
    if (state.status === 'idle') {
      setVisible(false)
      setIsSaved(false)
    }
  }, [state, fieldKey])

  if (state.status === 'error' && state.field === fieldKey) {
    return (
      <span role="alert" className="whitespace-nowrap text-xs text-[var(--destructive)]">
        {state.message}
      </span>
    )
  }

  if (visible && isSaved) {
    return (
      <span role="status" className="whitespace-nowrap text-xs font-medium text-[var(--accent)]">
        ✓ Saved
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
// EscalationThresholdField — inline-editable escalation_threshold_hours (TASK #8)
// ---------------------------------------------------------------------------

function EscalationThresholdField({ row }: { row: PipelineStageRow }) {
  const [state, action, pending] = useActionState<SaveFieldState, FormData>(
    updateEscalationThreshold,
    INITIAL_SAVE_FIELD_STATE,
  )
  const formRef = useRef<HTMLFormElement>(null)
  const fieldKey = `escalation:${row.stage}`

  const [value, setValue] = useState(String(row.escalation_threshold_hours))

  const handleBlur = useCallback(() => {
    const parsed = parseInt(value, 10)
    if (!isNaN(parsed) && parsed === row.escalation_threshold_hours) return
    formRef.current?.requestSubmit()
  }, [value, row.escalation_threshold_hours])

  return (
    <form ref={formRef} action={action} className="flex items-center gap-2">
      <input type="hidden" name="stage" value={row.stage} />
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          name="escalation_threshold_hours"
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={handleBlur}
          disabled={pending}
          min={1}
          step={1}
          aria-label={`Escalation threshold hours for ${row.stage} stage`}
          className={`${inputCls} w-20`}
        />
        <span className="shrink-0 text-xs text-[var(--text-muted)]">hrs</span>
      </div>
      <FieldStatus fieldKey={fieldKey} state={state} />
    </form>
  )
}

// ---------------------------------------------------------------------------
// SeverityLevelField — dropdown for severity_level (TASK #9)
// ---------------------------------------------------------------------------

function SeverityLevelField({ row }: { row: PipelineStageRow }) {
  const [state, action, pending] = useActionState<SaveFieldState, FormData>(
    updateSeverityLevel,
    INITIAL_SAVE_FIELD_STATE,
  )
  const formRef = useRef<HTMLFormElement>(null)
  const fieldKey = `severity:${row.stage}`

  const [value, setValue] = useState(row.severity_level)

  const handleChange = useCallback(() => {
    formRef.current?.requestSubmit()
  }, [])

  const getSeverityColor = (level: string): string => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'NONE':
        return 'bg-gray-100 text-gray-800 border-gray-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  return (
    <form ref={formRef} action={action} className="flex items-center gap-2">
      <input type="hidden" name="stage" value={row.stage} />
      <select
        name="severity_level"
        value={value}
        onChange={e => {
          setValue(e.target.value)
          setTimeout(() => handleChange(), 0)
        }}
        disabled={pending}
        className={`${inputCls} w-32`}
        aria-label={`Severity level for ${row.stage} stage`}
      >
        <option value="CRITICAL">CRITICAL</option>
        <option value="HIGH">HIGH</option>
        <option value="MEDIUM">MEDIUM</option>
        <option value="NONE">NONE</option>
      </select>
      <span
        className={`inline-block rounded-[var(--radius-pill)] px-2 py-0.5 text-[10px] font-medium border ${getSeverityColor(value)}`}
      >
        {value}
      </span>
      <FieldStatus fieldKey={fieldKey} state={state} />
    </form>
  )
}

// ---------------------------------------------------------------------------
// ThresholdField — inline-editable stall_threshold_hours
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
  const [rowStates, setRowStates] = useState<Record<string, 'unsaved' | 'saved'>>({})

  return (
    <div className="space-y-4">
      {/* Info banner about save indicators */}
      <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 py-3">
        <p className="text-xs text-[var(--text-muted)]">
          <span className="font-medium">Save indicators:</span> Fields auto-save on blur. Unsaved changes show a
          <span className="mx-1 inline-block h-2 w-3 rounded-l bg-[#E8B028]" title="Unsaved" />
          left border. Saved state shows
          <span className="mx-1 font-medium text-[var(--accent)]">✓</span>
          confirmation.
        </p>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-white text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              <th className="w-8 px-4 py-3">#</th>
              <th className="px-4 py-3">Stage key</th>
              <th className="px-4 py-3">Display label</th>
              <th className="px-4 py-3">Stall threshold</th>
              <th className="px-4 py-3">Escalation threshold</th>
              <th className="px-4 py-3">Severity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {stages.map(row => {
              const rowState = rowStates[row.stage]
              const borderClass =
                rowState === 'unsaved' ? 'border-l-4 border-l-[#E8B028]' : rowState === 'saved' ? 'border-l-4 border-l-[#6BAD94]' : ''

              return (
                <tr
                  key={row.stage}
                  className={`hover:bg-[var(--background)] transition-all ${borderClass}`}
                >
                  {/* Sort order */}
                  <td className="px-4 py-3 text-[var(--text-muted)]">{row.sort_order}</td>

                  {/* Stage key — read-only */}
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

                  {/* Editable escalation threshold */}
                  <td className="px-4 py-3">
                    <EscalationThresholdField row={row} />
                  </td>

                  {/* Editable severity level */}
                  <td className="px-4 py-3">
                    <SeverityLevelField row={row} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
