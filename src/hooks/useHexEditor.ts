import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BYTES_PER_ROW,
  hexStringToBytes,
  type Selection,
} from '../lib/hex'

const HEX_KEY = /^[0-9a-fA-F]$/

export type Nibble = 0 | 1

export interface HexEditor {
  data: Uint8Array
  selection: Selection | null
  cursor: number | null
  nibble: Nibble
  isDragging: boolean
  isLittleEndian: boolean
  setIsLittleEndian: (value: boolean) => void
  editorRef: React.RefObject<HTMLDivElement | null>
  handleByteMouseDown: (index: number, event: React.MouseEvent) => void
  handleKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void
  handleEditorBlur: (event: React.FocusEvent<HTMLDivElement>) => void
}

/**
 * Owns all editor state (bytes, selection, cursor, drag) and the interactions
 * that mutate it. State is kept in `useState` (not mirrored into refs), and
 * callbacks use functional updates so they never read stale values.
 */
export const useHexEditor = (
  hexString: string,
  editable: boolean,
): HexEditor => {
  const [data, setData] = useState<Uint8Array>(() => hexStringToBytes(hexString))
  const [selection, setSelection] = useState<Selection | null>(null)
  const [cursor, setCursor] = useState<number | null>(null)
  const [nibble, setNibble] = useState<Nibble>(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isLittleEndian, setIsLittleEndian] = useState(true)

  // Mutable bookkeeping that should never trigger a render.
  const selectionAnchorRef = useRef<number | null>(null)
  const dragStartRef = useRef<number | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  // Reset editor state when the source string changes, without an effect.
  // (https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  const [prevHexString, setPrevHexString] = useState(hexString)
  if (hexString !== prevHexString) {
    setPrevHexString(hexString)
    setData(hexStringToBytes(hexString))
    setSelection(null)
    setCursor(null)
    setNibble(0)
  }

  // The shift-click anchor is a non-render value, so clear it after commit.
  useEffect(() => {
    selectionAnchorRef.current = null
  }, [hexString])

  const handleByteMouseDown = useCallback(
    (index: number, event: React.MouseEvent) => {
      event.preventDefault()
      if (event.shiftKey && selectionAnchorRef.current !== null) {
        const anchor = selectionAnchorRef.current
        setSelection({ start: Math.min(anchor, index), end: Math.max(anchor, index) })
      } else {
        selectionAnchorRef.current = index
        dragStartRef.current = index
        setSelection({ start: index, end: index })
        setIsDragging(true)
      }
      if (editable) {
        setCursor(index)
        setNibble(0)
        editorRef.current?.focus()
      } else {
        setCursor(null)
      }
    },
    [editable],
  )

  const moveCursor = useCallback(
    (delta: number) => {
      if (data.length === 0) return
      const next = Math.min(Math.max((cursor ?? 0) + delta, 0), data.length - 1)
      setNibble(0)
      setCursor(next)
      setSelection({ start: next, end: next })
    },
    [cursor, data.length],
  )

  const writeNibble = useCallback(
    (hexChar: string) => {
      if (cursor === null || cursor < 0) return
      const value = Number.parseInt(hexChar, 16)
      const cur = cursor
      const nib = nibble

      setData((prev) => {
        if (cur >= prev.length) return prev
        const next = new Uint8Array(prev)
        const current = next[cur]
        next[cur] =
          nib === 0 ? (value << 4) | (current & 0x0f) : (current & 0xf0) | value
        return next
      })

      if (nib === 0) {
        setNibble(1)
      } else {
        setNibble(0)
        if (cur < data.length - 1) {
          setCursor(cur + 1)
          setSelection({ start: cur + 1, end: cur + 1 })
        }
      }
    },
    [cursor, nibble, data.length],
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (cursor === null) return
      const key = event.key

      if ((event.ctrlKey || event.metaKey) && key === 'c') {
        if (selection) {
          const bytes = data.slice(selection.start, selection.end + 1)
          const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(' ')
          void navigator.clipboard.writeText(hex)
        }
        return
      }

      if (editable && HEX_KEY.test(key)) {
        event.preventDefault()
        writeNibble(key)
        return
      }

      switch (key) {
        case 'ArrowLeft':
          event.preventDefault()
          moveCursor(-1)
          break
        case 'ArrowRight':
          event.preventDefault()
          moveCursor(1)
          break
        case 'ArrowUp':
          event.preventDefault()
          moveCursor(-BYTES_PER_ROW)
          break
        case 'ArrowDown':
          event.preventDefault()
          moveCursor(BYTES_PER_ROW)
          break
        case 'Home':
          event.preventDefault()
          moveCursor(-(cursor % BYTES_PER_ROW))
          break
        case 'End':
          event.preventDefault()
          moveCursor(BYTES_PER_ROW - 1 - (cursor % BYTES_PER_ROW))
          break
        case 'Escape':
          event.preventDefault()
          setSelection(null)
          setCursor(null)
          setNibble(0)
          break
        case 'Backspace':
          event.preventDefault()
          if (nibble === 1) setNibble(0)
          else moveCursor(-1)
          break
        default:
          break
      }
    },
    [cursor, nibble, selection, data, editable, moveCursor, writeNibble],
  )

  const handleEditorBlur = useCallback((event: React.FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setCursor(null)
      setNibble(0)
    }
  }, [])

  // Global drag-to-select. Re-subscribes only when the drag starts/stops; the
  // move handler reads the live anchor from a ref so it never goes stale.
  useEffect(() => {
    if (!isDragging) return
    const onMove = (event: MouseEvent) => {
      const start = dragStartRef.current
      if (start === null) return
      const element = document.elementFromPoint(event.clientX, event.clientY)
      const attr = element?.getAttribute('data-byte-index')
      if (attr == null) return
      const index = Number.parseInt(attr, 10)
      if (Number.isNaN(index)) return
      setSelection({ start: Math.min(start, index), end: Math.max(start, index) })
    }
    const onUp = () => {
      setIsDragging(false)
      dragStartRef.current = null
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [isDragging])

  return {
    data,
    selection,
    cursor,
    nibble,
    isDragging,
    isLittleEndian,
    setIsLittleEndian,
    editorRef,
    handleByteMouseDown,
    handleKeyDown,
    handleEditorBlur,
  }
}
