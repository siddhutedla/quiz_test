'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * While enabled: block copy/cut/paste/context-menu and track tab/window switches.
 * Client-side deterrence only — not a hard security boundary.
 */
export function useQuizProctoring(enabled: boolean) {
  const [tabSwitches, setTabSwitches] = useState(0)
  const [showLeaveWarning, setShowLeaveWarning] = useState(false)
  const tabSwitchesRef = useRef(0)

  useEffect(() => {
    if (!enabled) return

    const blockClipboard = (e: Event) => {
      e.preventDefault()
    }

    const blockKeys = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'v', 'a'].includes(key)) {
        e.preventDefault()
      }
      // Print / save / view source shortcuts commonly used to extract content
      if ((e.ctrlKey || e.metaKey) && ['p', 's', 'u'].includes(key)) {
        e.preventDefault()
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        tabSwitchesRef.current += 1
        setTabSwitches(tabSwitchesRef.current)
      } else if (document.visibilityState === 'visible' && tabSwitchesRef.current > 0) {
        setShowLeaveWarning(true)
      }
    }

    document.addEventListener('copy', blockClipboard, true)
    document.addEventListener('cut', blockClipboard, true)
    document.addEventListener('paste', blockClipboard, true)
    document.addEventListener('contextmenu', blockClipboard, true)
    document.addEventListener('keydown', blockKeys, true)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      document.removeEventListener('copy', blockClipboard, true)
      document.removeEventListener('cut', blockClipboard, true)
      document.removeEventListener('paste', blockClipboard, true)
      document.removeEventListener('contextmenu', blockClipboard, true)
      document.removeEventListener('keydown', blockKeys, true)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [enabled])

  const dismissWarning = () => setShowLeaveWarning(false)

  return {
    tabSwitches,
    tabSwitchesRef,
    showLeaveWarning,
    dismissWarning,
  }
}
