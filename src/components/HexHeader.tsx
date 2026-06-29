import { BYTES_PER_ROW } from '../lib/hex'

const ASCII_LABEL = ['A', 'S', 'C', 'I', 'I']

/** Sticky column header: the byte-offset gutter, the 0x00–0x0F columns and the ASCII label. */
export const HexHeader = () => (
  <div className="rhv-header">
    <span className="rhv-offset-label"> </span>
    {Array.from({ length: BYTES_PER_ROW }, (_, i) => {
      const hex = i.toString(16).padStart(2, '0').toUpperCase()
      return (
        <span key={hex} className="rhv-header-byte">
          {hex}
        </span>
      )
    })}
    {ASCII_LABEL.map((char, i) => (
      <span
        key={char + i}
        className={i === 0 ? 'rhv-header-ascii-title' : 'rhv-header-ascii-char'}
      >
        {char}
      </span>
    ))}
  </div>
)
