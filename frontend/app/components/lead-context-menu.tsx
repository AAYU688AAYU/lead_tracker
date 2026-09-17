'use client'

/**
 * LeadContextMenu
 *
 * Right-click context menu for lead cards with escalation actions:
 *   - Contact student (opens mailto)
 *   - View details (opens drawer)
 *   - Mark as resolved (for stalled leads)
 */

import { useState, useRef, useEffect } from 'react'

export interface ContextMenuAction {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  isDangerous?: boolean
  disabled?: boolean
}

interface LeadContextMenuProps {
  actions: ContextMenuAction[]
  trigger: React.ReactNode
}

export function LeadContextMenu({ actions, trigger }: LeadContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close menu on escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setPosition({ x: e.clientX, y: e.clientY })
    setIsOpen(true)
  }

  function handleActionClick(action: ContextMenuAction) {
    if (!action.disabled) {
      action.onClick()
      setIsOpen(false)
    }
  }

  return (
    <div ref={triggerRef} onContextMenu={handleContextMenu}>
      {trigger}

      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-50 min-w-48 rounded-[var(--radius-md)] border border-[var(--border)] bg-white shadow-lg"
          style={{
            top: `${position.y}px`,
            left: `${position.x}px`,
          }}
        >
          <div className="py-1">
            {actions.map((action, idx) => (
              <button
                key={idx}
                role="menuitem"
                type="button"
                onClick={() => handleActionClick(action)}
                disabled={action.disabled}
                className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                  action.disabled
                    ? 'text-[var(--text-muted)] cursor-not-allowed'
                    : action.isDangerous
                      ? 'text-[var(--destructive)] hover:bg-[var(--destructive)]/5'
                      : 'text-[var(--text)] hover:bg-[var(--background)]'
                }`}
              >
                {action.icon && (
                  <span className="h-4 w-4 shrink-0">{action.icon}</span>
                )}
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
