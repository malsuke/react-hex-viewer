import { useCallback, useEffect, useRef, useState } from 'react'
import { OVERSCAN_ROWS, ROW_HEIGHT } from '../lib/hex'

export interface VirtualRows {
  /** Attach to the scrolling viewport element. */
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  onScroll: (event: React.UIEvent<HTMLDivElement>) => void
  /** First row index to render (inclusive). */
  startRow: number
  /** Last row index to render (exclusive). */
  endRow: number
  /** Filler height that stands in for the rows above the window. */
  topSpacer: number
  /** Filler height that stands in for the rows below the window. */
  bottomSpacer: number
}

/**
 * Windowed rendering for a fixed-row-height list. Only the rows visible in the
 * viewport (plus a small overscan) are returned, with spacer heights so the
 * native scrollbar still reflects the full content.
 */
export const useVirtualRows = (totalRows: number): VirtualRows => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(400)

  const onScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop)
  }, [])

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setViewportHeight(entry.contentRect.height)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_ROWS)
  const endRow = Math.min(
    totalRows,
    Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN_ROWS,
  )

  return {
    scrollContainerRef,
    onScroll,
    startRow,
    endRow,
    topSpacer: startRow * ROW_HEIGHT,
    bottomSpacer: Math.max(0, totalRows - endRow) * ROW_HEIGHT,
  }
}
