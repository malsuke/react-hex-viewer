'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import './hex-viewer.css'

interface Selection {
  start: number
  end: number
}

function hexStringToBytes(hexString: string): Uint8Array {
  const normalized = hexString.replace(/\s+/g, '').toLowerCase()
  if (normalized.length === 0) return new Uint8Array(0)
  const padded = normalized.length % 2 === 1 ? `${normalized}0` : normalized
  const bytes = new Uint8Array(padded.length / 2)
  for (let i = 0; i < padded.length; i += 2) {
    const parsed = Number.parseInt(padded.slice(i, i + 2), 16)
    bytes[i / 2] = Number.isNaN(parsed) ? 0 : parsed
  }
  return bytes
}

export type HexViewerFont =
  | 'system'
  | 'jetbrains-mono'
  | 'fira-code'
  | 'source-code-pro'
  | 'consolas'
  | 'courier'

const FONT_MAP: Record<string, string> = {
  system:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  'jetbrains-mono': '"JetBrains Mono", monospace',
  'fira-code': '"Fira Code", monospace',
  'source-code-pro': '"Source Code Pro", monospace',
  consolas: 'Consolas, monospace',
  courier: '"Courier New", Courier, monospace',
}

export interface HexViewerProps {
  hexString?: string
  fontFamily?: HexViewerFont | (string & {})
  showDebugPanel?: boolean
  editable?: boolean
  className?: string
}

export const HexViewer = ({
  hexString = '00000000000000000000000000000000',
  fontFamily = 'jetbrains-mono',
  showDebugPanel = true,
  editable = true,
  className = '',
}: HexViewerProps) => {
  const [data, setData] = useState<Uint8Array>(() =>
    hexStringToBytes(hexString),
  )
  const [selection, setSelection] = useState<Selection | null>(null)
  const [isLittleEndian, setIsLittleEndian] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<number | null>(null)
  const selectionAnchorRef = useRef<number | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const littleEndianId = useId()
  const [cursor, setCursor] = useState<number | null>(null)
  const [nibble, setNibble] = useState<0 | 1>(0)

  useEffect(() => {
    setData(hexStringToBytes(hexString))
    setSelection(null)
    setCursor(null)
    setNibble(0)
    selectionAnchorRef.current = null
  }, [hexString])

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
          const index = Number.parseInt(
            element.getAttribute('data-byte-index')!,
          )
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

  const moveCursor = useCallback(
    (delta: number) => {
      if (data.length === 0) return
      const base = cursor ?? 0
      const next = Math.min(Math.max(base + delta, 0), data.length - 1)
      setNibble(0)
      setCursor(next)
      setSelection({ start: next, end: next })
    },
    [cursor, data.length],
  )

  const writeNibble = useCallback(
    (hexChar: string) => {
      if (!editable) return
      const value = Number.parseInt(hexChar, 16)
      setData((prev) => {
        if (cursor === null || cursor < 0 || cursor >= prev.length) return prev
        const next = new Uint8Array(prev)
        const current = next[cursor]
        next[cursor] =
          nibble === 0
            ? (value << 4) | (current & 0x0f)
            : (current & 0xf0) | value
        return next
      })
      if (cursor === null) return
      if (nibble === 0) {
        setNibble(1)
      } else {
        setNibble(0)
        if (cursor < data.length - 1) {
          const nextCursor = cursor + 1
          setCursor(nextCursor)
          setSelection({ start: nextCursor, end: nextCursor })
        }
      }
    },
    [cursor, nibble, data.length, editable],
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (cursor === null) return
      const key = event.key
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
        default:
          break
      }
    },
    [cursor, writeNibble, moveCursor, editable],
  )

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

  const formatHex = (value: number): string => {
    return value.toString(16).toLowerCase().padStart(2, '0')
  }

  const formatAscii = (value: number): string => {
    if (value === 32) return '\u00a0'
    if (value > 32 && value <= 126) return String.fromCharCode(value)
    return '.'
  }

  const getSelectedBytes = (): Uint8Array | null => {
    if (!selection) return null
    return data.slice(selection.start, selection.end + 1)
  }

  const interpretData = () => {
    const selectedBytes = getSelectedBytes()
    if (!selectedBytes || selectedBytes.length === 0) return null

    const view = new DataView(
      selectedBytes.buffer,
      selectedBytes.byteOffset,
      selectedBytes.byteLength,
    )

    try {
      return {
        binary: selectedBytes[0]?.toString(2).padStart(8, '0') || '00000000',
        int8: selectedBytes.length >= 1 ? view.getInt8(0) : null,
        uint8: selectedBytes.length >= 1 ? view.getUint8(0) : null,
        uint32:
          selectedBytes.length >= 4 ? view.getUint32(0, isLittleEndian) : null,
      }
    } catch {
      return null
    }
  }

  const interpretedData = interpretData()

  return (
    <div
      className={`rhv-container ${className}`.trim()}
      style={{
        fontFamily: FONT_MAP[fontFamily as string] || (fontFamily as string),
      }}
    >
      <div className="rhv-main">
        <div
          ref={editorRef}
          className={`rhv-editor ${showDebugPanel ? 'rhv-editor-with-panel' : 'rhv-editor-full'}${isDragging ? ' rhv-dragging' : ''}`}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: required for keyboard navigation in hex editor
          tabIndex={0}
          role="application"
          onKeyDown={handleKeyDown}
          onBlur={() => {
            setCursor(null)
            setNibble(0)
          }}
        >
          {/* Scrollable hex content */}
          <div className="rhv-scrollable">
            <div className="rhv-content-inner">
              {/* Header row */}
              <div className="rhv-header">
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

              {/* Data rows */}
              <div className="rhv-data-container">
                {Array.from(
                  { length: Math.ceil(data.length / 16) },
                  (_, rowIndex) => {
                    const offset = rowIndex * 16
                    const rowData = data.slice(offset, offset + 16)

                    return (
                      <div key={offset} className="rhv-row">
                        {/* Row label */}
                        <span className="rhv-row-offset">
                          {offset.toString(16).padStart(4, '0')}
                        </span>

                        {/* Hex bytes */}
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
                            const isCursor =
                              cursor === byteIndex && byte !== undefined
                            const hex =
                              byte !== undefined ? formatHex(byte) : '  '

                            return (
                              <span
                                key={byteIndex}
                                data-byte-index={byteIndex}
                                className={`rhv-hex-byte ${
                                  byte !== undefined
                                    ? 'rhv-text-white'
                                    : 'rhv-text-gray-600'
                                } ${isSelected ? 'rhv-bg-selected' : ''} ${
                                  isNull && !isSelected && !isCursor
                                    ? 'rhv-text-gray-500'
                                    : ''
                                } ${isCursor ? 'rhv-cursor-ring' : ''}`}
                                onMouseDown={(e) =>
                                  byte !== undefined &&
                                  handleByteMouseDown(byteIndex, e)
                                }
                              >
                                {isCursor ? (
                                  <>
                                    <span
                                      className={
                                        nibble === 0 ? 'rhv-cursor-nibble' : ''
                                      }
                                    >
                                      {hex[0]}
                                    </span>
                                    <span
                                      className={
                                        nibble === 1 ? 'rhv-cursor-nibble' : ''
                                      }
                                    >
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

                        {/* ASCII representation */}
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
                                  isSelected
                                    ? 'rhv-bg-selected'
                                    : 'rhv-text-ascii-default'
                                } ${
                                  ascii === '.' && !isSelected
                                    ? 'rhv-text-gray-500'
                                    : ''
                                }`}
                                onMouseDown={(e) =>
                                  handleByteMouseDown(byteIndex, e)
                                }
                              >
                                {ascii}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    )
                  },
                )}
              </div>
            </div>
          </div>

          <div className="rhv-status-bar">
            <div>
              {!editable
                ? '閲覧モード (編集不可)'
                : cursor !== null
                  ? `編集: 0x${cursor.toString(16).toUpperCase()} の${nibble === 0 ? '上位' : '下位'}4bit / 16進キーで上書き`
                  : 'バイトをクリックして16進キーで上書き編集'}
            </div>
            <div>
              {(data.length / 1024).toFixed(2)}KB (0x
              {data.length.toString(16).toUpperCase()})
            </div>
          </div>
        </div>

        {/* Debug sidebar */}
        {showDebugPanel && (
          <div className="rhv-debug-panel">
            <header className="rhv-debug-header">Debug</header>
            {selection ? (
              <div className="rhv-debug-content">
                <div className="rhv-debug-text">
                  Selection: 0x{selection.start.toString(16).toUpperCase()} - 0x
                  {selection.end.toString(16).toUpperCase()}
                </div>
                <div className="rhv-debug-text">
                  Size: {selection.end - selection.start + 1} (0x
                  {(selection.end - selection.start + 1)
                    .toString(16)
                    .toUpperCase()}
                  , {(selection.end - selection.start + 1) * 8} bits)
                </div>
                {interpretedData && (
                  <>
                    <div className="rhv-debug-text">
                      <div>Binary: {interpretedData.binary}</div>
                    </div>
                    {interpretedData.int8 !== null && (
                      <div className="rhv-debug-text">
                        Int8: {interpretedData.int8}
                      </div>
                    )}
                    {interpretedData.uint8 !== null && (
                      <div className="rhv-debug-text">
                        Uint8: {interpretedData.uint8}
                      </div>
                    )}
                    {interpretedData.uint32 !== null && (
                      <div className="rhv-debug-text">
                        Uint32: {interpretedData.uint32}
                      </div>
                    )}
                    <div className="rhv-endian-container">
                      <input
                        type="checkbox"
                        id={littleEndianId}
                        checked={isLittleEndian}
                        onChange={(e) => setIsLittleEndian(e.target.checked)}
                        className="rhv-checkbox"
                      />
                      <label
                        htmlFor={littleEndianId}
                        className="rhv-debug-text"
                      >
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
