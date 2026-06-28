'use client'

import { useEffect } from 'react'
import './hex-viewer.css'
import { BYTES_PER_ROW } from './lib/hex'
import { cx } from './lib/cx'
import { useHexEditor } from './hooks/useHexEditor'
import { useVirtualRows } from './hooks/useVirtualRows'
import { HexHeader } from './components/HexHeader'
import { HexRow } from './components/HexRow'
import { StatusBar } from './components/StatusBar'
import { DebugPanel } from './components/DebugPanel'

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
  const {
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
  } = useHexEditor(hexString, editable)

  const totalRows = Math.ceil(data.length / BYTES_PER_ROW)
  const { scrollContainerRef, onScroll, startRow, endRow, topSpacer, bottomSpacer } =
    useVirtualRows(totalRows)

  // Jump back to the top whenever a brand-new buffer is loaded.
  useEffect(() => {
    scrollContainerRef.current?.scrollTo(0, 0)
  }, [hexString, scrollContainerRef])

  const selStart = selection?.start ?? -1
  const selEnd = selection?.end ?? -1

  return (
    <div
      className={cx('rhv-container', className)}
      style={fontFamily ? { fontFamily } : undefined}
    >
      <div className="rhv-main">
        <div
          ref={editorRef}
          className={cx(
            'rhv-editor',
            showDebugPanel ? 'rhv-editor-with-panel' : 'rhv-editor-full',
            isDragging && 'rhv-dragging',
          )}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: required for keyboard navigation in hex editor
          tabIndex={0}
          role="application"
          aria-label="Hex editor. Arrow keys to navigate, hex keys to edit, Ctrl+C to copy."
          onKeyDown={handleKeyDown}
          onBlur={handleEditorBlur}
        >
          <div ref={scrollContainerRef} className="rhv-scrollable" onScroll={onScroll}>
            <div className="rhv-content-inner">
              <HexHeader />

              {topSpacer > 0 && <div aria-hidden="true" style={{ height: topSpacer }} />}

              <div className="rhv-data-container">
                {Array.from({ length: endRow - startRow }, (_, i) => {
                  const rowIndex = startRow + i
                  const offset = rowIndex * BYTES_PER_ROW
                  const cursorIndex =
                    cursor !== null && cursor >= offset && cursor < offset + BYTES_PER_ROW
                      ? cursor
                      : -1

                  return (
                    <HexRow
                      key={offset}
                      offset={offset}
                      data={data}
                      selStart={selStart}
                      selEnd={selEnd}
                      cursorIndex={cursorIndex}
                      nibble={cursorIndex >= 0 ? nibble : 0}
                      onByteMouseDown={handleByteMouseDown}
                    />
                  )
                })}
              </div>

              {bottomSpacer > 0 && (
                <div aria-hidden="true" style={{ height: bottomSpacer }} />
              )}
            </div>
          </div>

          <StatusBar
            editable={editable}
            cursor={cursor}
            nibble={nibble}
            byteLength={data.length}
          />
        </div>

        {showDebugPanel && (
          <DebugPanel
            selection={selection}
            data={data}
            isLittleEndian={isLittleEndian}
            onLittleEndianChange={setIsLittleEndian}
          />
        )}
      </div>
    </div>
  )
}
