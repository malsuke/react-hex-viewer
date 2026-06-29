/**
 * Pure, framework-agnostic helpers for parsing and formatting binary data.
 * Keeping these out of the React tree makes them trivial to unit test and reuse.
 */

export const BYTES_PER_ROW = 16
export const ROW_HEIGHT = 20
export const OVERSCAN_ROWS = 5

/** Parse a (possibly whitespace-separated) hex string into bytes. */
export const hexStringToBytes = (hexString: string): Uint8Array => {
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

/** Format a single byte as a two-digit lowercase hex string. */
export const formatHex = (value: number): string =>
  value.toString(16).toLowerCase().padStart(2, '0')

/** Map a byte to its printable ASCII glyph, or a placeholder. */
export const formatAscii = (value: number): string => {
  // Non-breaking space keeps the cell width stable in the monospace grid.
  if (value === 32) return ' '
  if (value > 32 && value <= 126) return String.fromCharCode(value)
  return '.'
}

export interface Selection {
  start: number
  end: number
}

export interface Interpretation {
  binary: string
  int8: number | null
  uint8: number | null
  int16: number | null
  uint16: number | null
  int32: number | null
  uint32: number | null
  float32: number | null
  float64: number | null
}

/**
 * Interpret the leading bytes of a selection as the various numeric types,
 * returning `null` for any type that does not have enough bytes available.
 */
export const interpretBytes = (
  bytes: Uint8Array,
  littleEndian: boolean,
): Interpretation | null => {
  if (bytes.length === 0) return null

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const le = littleEndian

  try {
    return {
      binary: bytes[0]?.toString(2).padStart(8, '0') ?? '00000000',
      int8: bytes.length >= 1 ? view.getInt8(0) : null,
      uint8: bytes.length >= 1 ? view.getUint8(0) : null,
      int16: bytes.length >= 2 ? view.getInt16(0, le) : null,
      uint16: bytes.length >= 2 ? view.getUint16(0, le) : null,
      int32: bytes.length >= 4 ? view.getInt32(0, le) : null,
      uint32: bytes.length >= 4 ? view.getUint32(0, le) : null,
      float32: bytes.length >= 4 ? view.getFloat32(0, le) : null,
      float64: bytes.length >= 8 ? view.getFloat64(0, le) : null,
    }
  } catch {
    return null
  }
}
