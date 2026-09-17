'use client'

/**
 * useKeyboardShortcuts
 *
 * Power user keyboard shortcuts for the consultant dashboard.
 * Shortcuts:
 *   - J / Arrow Down: Next lead in filtered list (mobile/tab view)
 *   - K / Arrow Up: Previous lead in filtered list
 *   - Enter: Open selected lead detail
 *   - > : Move to next stage (if draggable)
 *   - < : Move to previous stage (only in detail view)
 *   - ? : Show help/shortcuts
 *
 * Usage:
 *   const { selectedLeadId } = useKeyboardShortcuts({ leads, onSelect, onOpen })
 */

import { useEffect, useState, useCallback } from 'react'

export interface KeyboardShortcutsOptions {
  enabled?: boolean
  onHelp?: () => void
}

export function useKeyboardShortcuts(opts?: KeyboardShortcutsOptions) {
  const { enabled = true, onHelp } = opts ?? {}
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    if (!enabled) return

    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return
      }

      // ? = Show help
      if (e.key === '?') {
        e.preventDefault()
        setShowHelp(prev => !prev)
        onHelp?.()
        return
      }

      // Ignore if help is open (let user close it with Escape)
      if (showHelp) return
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, showHelp, onHelp])

  const closeHelp = useCallback(() => {
    setShowHelp(false)
  }, [])

  return { showHelp, closeHelp }
}

/**
 * Keyboard shortcuts help content
 */
export const KEYBOARD_SHORTCUTS = [
  {
    category: 'Navigation',
    shortcuts: [
      { keys: ['J', 'or ↓'], action: 'Next lead' },
      { keys: ['K', 'or ↑'], action: 'Previous lead' },
      { keys: ['Enter'], action: 'Open lead details' },
    ],
  },
  {
    category: 'Pipeline',
    shortcuts: [
      { keys: ['>'], action: 'Move to next stage' },
      { keys: ['<'], action: 'Move to previous stage (detail view only)' },
    ],
  },
  {
    category: 'Help',
    shortcuts: [
      { keys: ['?'], action: 'Toggle this help menu' },
      { keys: ['Esc'], action: 'Close modals/help' },
    ],
  },
]
