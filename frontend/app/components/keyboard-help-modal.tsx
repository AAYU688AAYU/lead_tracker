'use client'

/**
 * KeyboardHelpModal
 *
 * Shows available keyboard shortcuts in a modal overlay.
 */

import { KEYBOARD_SHORTCUTS } from '@/lib/hooks/use-keyboard-shortcuts'

interface KeyboardHelpModalProps {
  isOpen: boolean
  onClose: () => void
}

export function KeyboardHelpModal({ isOpen, onClose }: KeyboardHelpModalProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        role="presentation"
        aria-hidden
      />

      {/* Modal */}
      <div
        className="fixed inset-x-4 top-1/2 z-50 w-auto max-w-2xl -translate-y-1/2 rounded-[var(--radius-md)] border border-[var(--border)] bg-white shadow-lg"
        style={{ left: '50%', transform: 'translate(-50%, -50%)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-help-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <h2 id="keyboard-help-title" className="text-lg font-semibold text-[var(--text)]">
            Keyboard Shortcuts
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--radius-sm)] p-1 text-[var(--text-muted)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label="Close help"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="max-h-96 overflow-y-auto px-6 py-4 space-y-6">
          {KEYBOARD_SHORTCUTS.map(section => (
            <div key={section.category}>
              <h3 className="mb-3 text-sm font-semibold text-[var(--text)] uppercase tracking-wide">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.shortcuts.map((shortcut, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-muted)]">{shortcut.action}</span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key, keyIdx) => (
                        <div key={keyIdx} className="flex items-center gap-1">
                          {keyIdx > 0 && (
                            <span className="text-xs text-[var(--text-muted)]">or</span>
                          )}
                          <kbd className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs font-medium text-[var(--text)] shadow-sm">
                            {key}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border)] bg-[var(--background)] px-6 py-3 text-center">
          <p className="text-xs text-[var(--text-muted)]">
            Press <kbd className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-white px-1.5 py-0.5 text-xs font-medium">Esc</kbd> or click outside to close
          </p>
        </div>
      </div>
    </>
  )
}
