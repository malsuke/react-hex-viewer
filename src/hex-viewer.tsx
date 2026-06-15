'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import './hex-viewer.css'

function hexStringToBytes(hexString: string): Uint8Array {
  const normalized = hexString.replace(/\s+/g, '').toLowerCase()
  if (normalized.length === 0) return new Uint8Array(0)
  const padded = normalized.length % 2 === 1 ? `0${normalized}` : normalized
  const bytes = new Uint8Array(padded.length / 2)
  for (let i = 0; i < padded.length; i += 2) {
    const parsed = Number.parseInt(padded.slice(i, i + 2), 16)
    bytes[i / 2] = Number.isNaN(parsed) ? 0 : parsed
  }
  return bytes
}

const formatHex = (value: number): string =>
  value.toString(16).toLowerCase().padStart(2, '0')

const formatAscii = (value: number): string => {
  if (value === 32) return '\u00a0'
  if (value > 32 && value <= 126) return String.fromCharCode(value)
  return '.'
}

const ROW_HEIGHT = 20
const OVERSCAN_ROWS = 5

interface Selection {
  start: number
  end: number
}

export interface HexViewerProps {
  hexString?: string
  fontFamily?: string
  showDebugPanel?: boolean
  editable?: boolean
  className?: string
}

export const HexViewer = ({
  hexString = '00000000000000000000000000000000',
  fontFamily,
  showDebugPanel = true,
  editable = true,
  className = '',
}: HexViewerProps) => {
  const [data, setData] = useState<Uint8Array>(() => hexStringToBytes(hexString))
  const [selection, setSelection] = useState<Selection | null>(null)
  const [isLittleEndian, setIsLittleEndian] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [cursor, setCursor] = useState<number | null>(null)
  const [nibble, setNibble] = useState<0 | 1>(0)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(400)

  const cursorRef = useRef<number | null>(null)
  cursorRef.current = cursor
  const nibbleRef = useRef<0 | 1>(0)
  nibbleRef.current = nibble
  const selectionRef = useRef<Selection | null>(null)
  selectionRef.current = selection
  const dataRef = useRef<Uint8Array>(data)
  dataRef.current = data

  const dragStartRef = useRef<number | null>(null)
  const selectionAnchorRef = useRef<number | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const littleEndianId = useId()

  useEffect(() => {
    setData(hexStringToBytes(hexString))
    setSelection(null)
    setCursor(null)
    setNibble(0)
    setScrollTop(0)
    selectionAnchorRef.current = null
  }, [hexString])

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const totalRows = Math.ceil(data.length / 16)
  const startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_ROWS)
  const endRow = Math.min(
    totalRows,
    Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN_ROWS,
  )
  const topSpacerHeight = startRow * ROW_HEIGHT
  const bottomSpacerHeight = (totalRows - endRow) * ROW_HEIGHT

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  const handleByteMouseDown = useCallback(
    (index: number, event: React.MouseEvent) => {
      event.preventDefault()
      if (event.shiftKey && selectionAnchorRef.current !== null) {
        const anchor = selectionAnchorRef.current
        setSelection({
          start: Math.min(anchor, index),
          end: Math.max(anchor, index),
        })
      } else {
        selectionAnchorRef.current = index
        setSelection({ start: index, end: index })
        setIsDragging(true)
        dragStartRef.current = index
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

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (isDragging && dragStartRef.current !== null) {
        const element = document.elementFromPoint(event.clientX, event.clientY)
        if (element?.hasAttribute('data-byte-index')) {
          const index = Number.parseInt(element.getAttribute('data-byte-index')!)
          setSelection({
            start: Math.min(dragStartRef.current, index),
            end: Math.max(dragStartRef.current, index),
          })
        }
      }
    },
    [isDragging],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    dragStartRef.current = null
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const moveCursor = useCallback((delta: number) => {
    const len = dataRef.current.length
    if (len === 0) return
    const base = cursorRef.current ?? 0
    const next = Math.min(Math.max(base + delta, 0), len - 1)
    setNibble(0)
    setCursor(next)
    setSelection({ start: next, end: next })
  }, [])

  const writeNibble = useCallback(
    (hexChar: string) => {
      if (!editable) return
      const value = Number.parseInt(hexChar, 16)
      const cur = cursorRef.current
      const nib = nibbleRef.current

      setData((prev) => {
        if (cur === null || cur < 0 || cur >= prev.length) return prev
        const next = new Uint8Array(prev)
        const current = next[cur]
        next[cur] =
          nib === 0
            ? (value << 4) | (current & 0x0f)
            : (current & 0xf0) | value
        return next
      })

      if (cur === null) return
      if (nib === 0) {
        setNibble(1)
      } else {
        setNibble(0)
        if (cur < dataRef.current.length - 1) {
          const nextCursor = cur + 1
          setCursor(nextCursor)
          setSelection({ start: nextCursor, end: nextCursor })
        }
      }
    },
    [editable],
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const cur = cursorRef.current
      if (cur === null) return
      const key = event.key
      const nib = nibbleRef.current

      if ((event.ctrlKey || event.metaKey) && key === 'c') {
        const sel = selectionRef.current
        if (sel) {
          const bytes = dataRef.current.slice(sel.start, sel.end + 1)
          const hex = Array.from(bytes)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join(' ')
          navigator.clipboard.writeText(hex)
        }
        return
      }

      if (editable && /^[0-9a-fA-F]$/.test(key)) {
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
          moveCursor(-16)
          break
        case 'ArrowDown':
          event.preventDefault()
          moveCursor(16)
          break
        case 'Home':
          event.preventDefault()
          moveCursor(-(cur % 16))
          break
        case 'End':
          event.preventDefault()
          moveCursor(15 - (cur % 16))
          break
        case 'Escape':
          event.preventDefault()
          setSelection(null)
          setCursor(null)
          setNibble(0)
          break
        case 'Backspace':
          event.preventDefault()
          if (nib === 1) {
                setNibble(0)
          } else {
            moveCursor(-1)
          }
          break
        default:
          break
      }
    },
    [writeNibble, moveCursor, editable],
  )

  const interpretedData = useMemo(() => {
    if (!selection) return null
    const selectedBytes = data.slice(selection.start, selection.end + 1)
    if (selectedBytes.length === 0) return null

    const view = new DataView(
      selectedBytes.buffer,
      selectedBytes.byteOffset,
      selectedBytes.byteLength,
    )
    const le = isLittleEndian

    try {
      return {
        binary:  selectedBytes[0]?.toString(2).padStart(8, '0') ?? '00000000',
        int8:    selectedBytes.length >= 1 ? view.getInt8(0)            : null,
        uint8:   selectedBytes.length >= 1 ? view.getUint8(0)           : null,
        int16:   selectedBytes.length >= 2 ? view.getInt16(0, le)       : null,
        uint16:  selectedBytes.length >= 2 ? view.getUint16(0, le)      : null,
        int32:   selectedBytes.length >= 4 ? view.getInt32(0, le)       : null,
        uint32:  selectedBytes.length >= 4 ? view.getUint32(0, le)      : null,
        float32: selectedBytes.length >= 4 ? view.getFloat32(0, le)     : null,
        float64: selectedBytes.length >= 8 ? view.getFloat64(0, le)     : null,
      }
    } catch {
      return null
    }
  }, [selection, data, isLittleEndian])

  return (
    <div
      className={`rhv-container ${className}`.trim()}
      style={fontFamily ? { fontFamily } : undefined}
    >
      <div className="rhv-main">
        <div
          ref={editorRef}
          className={`rhv-editor ${showDebugPanel ? 'rhv-editor-with-panel' : 'rhv-editor-full'}${isDragging ? ' rhv-dragging' : ''}`}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: required for keyboard navigation in hex editor
          tabIndex={0}
          role="application"
          aria-label="Hex editor. Arrow keys to navigate, hex keys to edit, Ctrl+C to copy."
          onKeyDown={handleKeyDown}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setCursor(null)
              setNibble(0)
            }
          }}
        >
          <div
            ref={scrollContainerRef}
            className="rhv-scrollable"
            onScroll={handleScroll}
          >
            <div className="rhv-content-inner">
              <div className="rhv-header" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <span className="rhv-offset-label"> </span>
                {Array.from({ length: 16 }, (_, i) => {
                  const hex = i.toString(16).padStart(2, '0').toUpperCase()
                  return (
                    <span key={hex} className="rhv-header-byte">
                      {hex}
                    </span>
                  )
                })}
                <span className="rhv-header-ascii-title">A</span>
                <span className="rhv-header-ascii-char">S</span>
                <span className="rhv-header-ascii-char">C</span>
                <span className="rhv-header-ascii-char">I</span>
                <span className="rhv-header-ascii-char">I</span>
              </div>

              {topSpacerHeight > 0 && (
                <div aria-hidden="true" style={{ height: topSpacerHeight }} />
              )}

              <div className="rhv-data-container">
                {Array.from({ length: endRow - startRow }, (_, i) => {
                  const rowIndex = startRow + i
                  const offset = rowIndex * 16
                  const rowData = data.slice(offset, offset + 16)

                  return (
                    <div key={offset} className="rhv-row">
                      <span className="rhv-row-offset">
                        {offset.toString(16).padStart(4, '0')}
                      </span>

                      <div className="rhv-hex-bytes">
                        {Array.from({ length: 16 }, (_, colIndex) => {
                          const byteIndex = offset + colIndex
                          const byte = rowData[colIndex]
                          const isSelected =
                            selection &&
                            byteIndex >= selection.start &&
                            byteIndex <= selection.end &&
                            byte !== undefined
                          const isNull = byte === 0
                          const isCursor = cursor === byteIndex && byte !== undefined
                          const hex = byte !== undefined ? formatHex(byte) : '  '

                          return (
                            <span
                              key={byteIndex}
                              data-byte-index={byteIndex}
                              className={`rhv-hex-byte ${
                                byte !== undefined ? 'rhv-text-white' : 'rhv-text-gray-600'
                              } ${isSelected ? 'rhv-bg-selected' : ''} ${
                                isNull && !isSelected && !isCursor
                                  ? 'rhv-text-gray-500'
                                  : ''
                              } ${isCursor ? 'rhv-cursor-ring' : ''}`}
                              onMouseDown={(e) =>
                                byte !== undefined && handleByteMouseDown(byteIndex, e)
                              }
                            >
                              {isCursor ? (
                                <>
                                  <span className={nibble === 0 ? 'rhv-cursor-nibble' : ''}>
                                    {hex[0]}
                                  </span>
                                  <span className={nibble === 1 ? 'rhv-cursor-nibble' : ''}>
                                    {hex[1]}
                                  </span>
                                </>
                              ) : (
                                hex
                              )}
                            </span>
                          )
                        })}
                      </div>

                      <div className="rhv-ascii-bytes">
                        {Array.from(rowData, (byte, i) => {
                          const byteIndex = offset + i
                          const isSelected =
                            selection &&
                            byteIndex >= selection.start &&
                            byteIndex <= selection.end
                          const ascii = formatAscii(byte)

                          return (
                            <span
                              key={byteIndex}
                              data-byte-index={byteIndex}
                              className={`rhv-ascii-byte ${
                                isSelected ? 'rhv-bg-selected' : 'rhv-text-ascii-default'
                              } ${ascii === '.' && !isSelected ? 'rhv-text-gray-500' : ''}`}
                              onMouseDown={(e) => handleByteMouseDown(byteIndex, e)}
                            >
                              {ascii}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {bottomSpacerHeight > 0 && (
                <div aria-hidden="true" style={{ height: bottomSpacerHeight }} />
              )}
            </div>
          </div>

          <div className="rhv-status-bar">
            <div>
              {!editable
                ? 'Read-only mode'
                : cursor !== null
                  ? `Editing: 0x${cursor.toString(16).toUpperCase()} · ${nibble === 0 ? 'high' : 'low'} nibble · Overwrite with hex key`
                  : 'Click a byte to edit · Ctrl+C to copy selection'}
            </div>
            <div>
              {(data.length / 1024).toFixed(2)}KB (0x
              {data.length.toString(16).toUpperCase()})
            </div>
          </div>
        </div>
                    
        {showDebugPanel && (
          <div className="rhv-debug-panel">
            <header className="rhv-debug-header">Debug</header>
            {selection ? (
              <div className="rhv-debug-content">
                <div className="rhv-debug-text">
                  Selection: 0x{selection.start.toString(16).toUpperCase()} –{' '}
                  0x{selection.end.toString(16).toUpperCase()}
                </div>
                <div className="rhv-debug-text">
                  Size: {selection.end - selection.start + 1} bytes (
                  {(selection.end - selection.start + 1) * 8} bits)
                </div>
                {interpretedData && (
                  <>
                    <div className="rhv-debug-text">Binary: {interpretedData.binary}</div>
                    {interpretedData.int8    !== null && <div className="rhv-debug-text">Int8:    {interpretedData.int8}</div>}
                    {interpretedData.uint8   !== null && <div className="rhv-debug-text">Uint8:   {interpretedData.uint8}</div>}
                    {interpretedData.int16   !== null && <div className="rhv-debug-text">Int16:   {interpretedData.int16}</div>}
                    {interpretedData.uint16  !== null && <div className="rhv-debug-text">Uint16:  {interpretedData.uint16}</div>}
                    {interpretedData.int32   !== null && <div className="rhv-debug-text">Int32:   {interpretedData.int32}</div>}
                    {interpretedData.uint32  !== null && <div className="rhv-debug-text">Uint32:  {interpretedData.uint32}</div>}
                    {interpretedData.float32 !== null && <div className="rhv-debug-text">Float32: {interpretedData.float32.toPrecision(7)}</div>}
                    {interpretedData.float64 !== null && <div className="rhv-debug-text">Float64: {interpretedData.float64}</div>}
                    <div className="rhv-endian-container">
                      <input
                        type="checkbox"
                        id={littleEndianId}
                        checked={isLittleEndian}
                        onChange={(e) => setIsLittleEndian(e.target.checked)}
                        className="rhv-checkbox"
                      />
                      <label htmlFor={littleEndianId} className="rhv-debug-text">
                        Little Endian
                      </label>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="rhv-debug-text-muted">No selection</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}