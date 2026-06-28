import { describe, expect, it } from 'vitest'
import {
  formatAscii,
  formatHex,
  hexStringToBytes,
  interpretBytes,
} from './hex'

describe('hexStringToBytes', () => {
  it('returns an empty array for an empty string', () => {
    expect(hexStringToBytes('')).toEqual(new Uint8Array(0))
  })

  it('returns an empty array for whitespace only', () => {
    expect(hexStringToBytes('   \n\t')).toEqual(new Uint8Array(0))
  })

  it('parses a plain hex string', () => {
    expect(hexStringToBytes('48656c6c6f')).toEqual(
      new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]),
    )
  })

  it('ignores all whitespace between bytes', () => {
    expect(hexStringToBytes('de ad\tbe\nef')).toEqual(
      new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
    )
  })

  it('is case-insensitive', () => {
    expect(hexStringToBytes('CAFEbabe')).toEqual(
      new Uint8Array([0xca, 0xfe, 0xba, 0xbe]),
    )
  })

  it('left-pads an odd-length string with a leading zero nibble', () => {
    expect(hexStringToBytes('abc')).toEqual(new Uint8Array([0x0a, 0xbc]))
  })

  it('treats non-hex characters as 0x00', () => {
    // "zz" -> NaN -> 0, "ff" stays 0xff
    expect(hexStringToBytes('zzff')).toEqual(new Uint8Array([0x00, 0xff]))
  })
})

describe('formatHex', () => {
  it('pads single digits to two lowercase characters', () => {
    expect(formatHex(0)).toBe('00')
    expect(formatHex(5)).toBe('05')
    expect(formatHex(15)).toBe('0f')
  })

  it('formats full bytes in lowercase', () => {
    expect(formatHex(0xab)).toBe('ab')
    expect(formatHex(255)).toBe('ff')
  })
})

describe('formatAscii', () => {
  it('renders printable ASCII verbatim', () => {
    expect(formatAscii(0x41)).toBe('A')
    expect(formatAscii(0x7e)).toBe('~')
  })

  it('renders a space as a non-breaking space to keep cell width', () => {
    expect(formatAscii(32)).toBe('\u00a0')
  })

  it('renders control characters as a dot', () => {
    expect(formatAscii(0)).toBe('.')
    expect(formatAscii(31)).toBe('.')
  })

  it('renders DEL and high bytes as a dot', () => {
    expect(formatAscii(127)).toBe('.')
    expect(formatAscii(200)).toBe('.')
  })
})

describe('interpretBytes', () => {
  it('returns null for an empty selection', () => {
    expect(interpretBytes(new Uint8Array(0), true)).toBeNull()
  })

  it('exposes the binary form of the first byte', () => {
    const result = interpretBytes(new Uint8Array([0b1010_0101]), true)
    expect(result?.binary).toBe('10100101')
  })

  it('omits wider types when there are not enough bytes', () => {
    const result = interpretBytes(new Uint8Array([0xff]), true)
    expect(result?.int8).toBe(-1)
    expect(result?.uint8).toBe(255)
    expect(result?.int16).toBeNull()
    expect(result?.uint32).toBeNull()
    expect(result?.float64).toBeNull()
  })

  it('respects little-endian byte order', () => {
    const result = interpretBytes(new Uint8Array([0x01, 0x00]), true)
    expect(result?.uint16).toBe(1)
  })

  it('respects big-endian byte order', () => {
    const result = interpretBytes(new Uint8Array([0x01, 0x00]), false)
    expect(result?.uint16).toBe(256)
  })

  it('reads from a non-zero byteOffset slice correctly', () => {
    // Selection slices share the underlying buffer; interpret must honour the
    // slice's byteOffset rather than reading from the start of the buffer.
    const full = new Uint8Array([0x00, 0x00, 0x01, 0x00])
    const slice = full.slice(2, 4)
    expect(interpretBytes(slice, true)?.uint16).toBe(1)
  })

  it('decodes a 32-bit float', () => {
    const result = interpretBytes(new Uint8Array([0x00, 0x00, 0x80, 0x3f]), true)
    expect(result?.float32).toBeCloseTo(1, 5)
  })
})
