import type { Nibble } from '../hooks/useHexEditor'

export interface StatusBarProps {
  editable: boolean
  cursor: number | null
  nibble: Nibble
  byteLength: number
}

export const StatusBar = ({ editable, cursor, nibble, byteLength }: StatusBarProps) => {
  const message = !editable
    ? 'Read-only mode'
    : cursor !== null
      ? `Editing: 0x${cursor.toString(16).toUpperCase()} · ${nibble === 0 ? 'high' : 'low'} nibble · Overwrite with hex key`
      : 'Click a byte to edit · Ctrl+C to copy selection'

  return (
    <div className="rhv-status-bar">
      <div>{message}</div>
      <div>
        {(byteLength / 1024).toFixed(2)}KB (0x
        {byteLength.toString(16).toUpperCase()})
      </div>
    </div>
  )
}
