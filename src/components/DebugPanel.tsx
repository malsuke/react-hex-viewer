import { useId, useMemo } from 'react'
import { interpretBytes, type Selection } from '../lib/hex'

export interface DebugPanelProps {
  selection: Selection | null
  data: Uint8Array
  isLittleEndian: boolean
  onLittleEndianChange: (value: boolean) => void
}

interface NumericRowProps {
  label: string
  value: number | string | null
}

/** One labelled numeric interpretation, hidden when there aren't enough bytes. */
const NumericRow = ({ label, value }: NumericRowProps) =>
  value === null ? null : (
    <div className="rhv-debug-text">
      {label.padEnd(8)}
      {value}
    </div>
  )

export const DebugPanel = ({
  selection,
  data,
  isLittleEndian,
  onLittleEndianChange,
}: DebugPanelProps) => {
  const littleEndianId = useId()

  const interpretation = useMemo(() => {
    if (!selection) return null
    const bytes = data.slice(selection.start, selection.end + 1)
    return interpretBytes(bytes, isLittleEndian)
  }, [selection, data, isLittleEndian])

  return (
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
          {interpretation && (
            <>
              <div className="rhv-debug-text">Binary: {interpretation.binary}</div>
              <NumericRow label="Int8:" value={interpretation.int8} />
              <NumericRow label="Uint8:" value={interpretation.uint8} />
              <NumericRow label="Int16:" value={interpretation.int16} />
              <NumericRow label="Uint16:" value={interpretation.uint16} />
              <NumericRow label="Int32:" value={interpretation.int32} />
              <NumericRow label="Uint32:" value={interpretation.uint32} />
              <NumericRow
                label="Float32:"
                value={
                  interpretation.float32 === null
                    ? null
                    : interpretation.float32.toPrecision(7)
                }
              />
              <NumericRow label="Float64:" value={interpretation.float64} />
              <div className="rhv-endian-container">
                <input
                  type="checkbox"
                  id={littleEndianId}
                  checked={isLittleEndian}
                  onChange={(e) => onLittleEndianChange(e.target.checked)}
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
  )
}
