import { memo } from 'react'
import { BYTES_PER_ROW, formatAscii, formatHex } from '../lib/hex'
import { cx } from '../lib/cx'
import type { Nibble } from '../hooks/useHexEditor'

export interface HexRowProps {
  /** Byte index of the first cell in this row. */
  offset: number
  /** The full byte buffer; the row reads its own slice by offset. */
  data: Uint8Array
  /** Inclusive selection bounds, or -1 when nothing is selected. */
  selStart: number
  selEnd: number
  /** Cursor byte index, or -1 when the cursor is not in this row. */
  cursorIndex: number
  /** Active nibble of the cursor (only meaningful when cursorIndex >= 0). */
  nibble: Nibble
  onByteMouseDown: (index: number, event: React.MouseEvent) => void
}

const isWithin = (index: number, start: number, end: number) =>
  start >= 0 && index >= start && index <= end

const HexRowComponent = ({
  offset,
  data,
  selStart,
  selEnd,
  cursorIndex,
  nibble,
  onByteMouseDown,
}: HexRowProps) => (
  <div className="rhv-row">
    <span className="rhv-row-offset">
      {offset.toString(16).padStart(4, '0')}
    </span>

    <div className="rhv-hex-bytes">
      {Array.from({ length: BYTES_PER_ROW }, (_, col) => {
        const byteIndex = offset + col
        const byte = data[byteIndex]
        const present = byte !== undefined
        const isSelected = present && isWithin(byteIndex, selStart, selEnd)
        const isCursor = present && byteIndex === cursorIndex
        const isNull = byte === 0
        const hex = present ? formatHex(byte) : '  '

        return (
          <span
            key={byteIndex}
            data-byte-index={byteIndex}
            className={cx(
              'rhv-hex-byte',
              present ? 'rhv-text-white' : 'rhv-text-gray-600',
              isSelected && 'rhv-bg-selected',
              isNull && !isSelected && !isCursor && 'rhv-text-gray-500',
              isCursor && 'rhv-cursor-ring',
            )}
            onMouseDown={(e) => present && onByteMouseDown(byteIndex, e)}
          >
            {isCursor ? (
              <>
                <span className={nibble === 0 ? 'rhv-cursor-nibble' : undefined}>
                  {hex[0]}
                </span>
                <span className={nibble === 1 ? 'rhv-cursor-nibble' : undefined}>
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
      {Array.from({ length: BYTES_PER_ROW }, (_, col) => {
        const byteIndex = offset + col
        const byte = data[byteIndex]
        if (byte === undefined) return null
        const isSelected = isWithin(byteIndex, selStart, selEnd)
        const ascii = formatAscii(byte)

        return (
          <span
            key={byteIndex}
            data-byte-index={byteIndex}
            className={cx(
              'rhv-ascii-byte',
              isSelected ? 'rhv-bg-selected' : 'rhv-text-ascii-default',
              ascii === '.' && !isSelected && 'rhv-text-gray-500',
            )}
            onMouseDown={(e) => onByteMouseDown(byteIndex, e)}
          >
            {ascii}
          </span>
        )
      })}
    </div>
  </div>
)

/**
 * Rows are memoized so that navigating the cursor or editing a byte only
 * re-renders the affected rows, not the entire viewport.
 */
export const HexRow = memo(HexRowComponent)
