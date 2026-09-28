// Spec-first contract for the extracted pin resolver (E2 — canonical connect). This table IS
// the public resolution semantics: id → label (case-insensitive) → numeric index → direction
// keyword → undefined single-pin default, with direction validation and a helpful error listing
// available pins. Error message strings are contract (they feed the troubleshooting page).
import { describe, it, expect } from 'vitest'
import { resolvePin, type ResolvableNode, type ResolvablePin } from './pin-resolve.js'

type PinSpec = [id: string, dir: 'in' | 'out', label?: string, type?: string]

function nodeOf(pins: PinSpec[], type = 'Mix'): ResolvableNode {
  return {
    id: 'n1',
    type,
    pins: pins.map(([id, direction, label, t]) => ({
      id,
      kind: 'data' as const,
      direction,
      type: t ?? 'float',
      ...(label !== undefined ? { label } : {}),
    })),
  }
}

// [In, Out] two-pin node + a third unlabeled input — the common shape.
const MIX = nodeOf([
  ['p-in', 'in', 'In'],
  ['p-out', 'out', 'Out'],
  ['p-aux', 'in'],
])

describe('resolvePin — reference forms', () => {
  it('resolves an exact pin id first (ids win over labels)', () => {
    const n = nodeOf([['x', 'out', 'x'], ['y', 'out', 'x']]) // duplicate label, distinct ids
    expect(resolvePin(n, 'y', 'out').id).toBe('y')
  })

  it('resolves by label, case-insensitively and whitespace-trimmed', () => {
    expect(resolvePin(MIX, 'Out', 'out').id).toBe('p-out')
    expect(resolvePin(MIX, '  out ', 'out').id).toBe('p-out')
    expect(resolvePin(MIX, 'IN', 'in').id).toBe('p-in')
  })

  it('resolves a numeric string as an index', () => {
    expect(resolvePin(MIX, '0', 'in').id).toBe('p-in')
    expect(resolvePin(MIX, '2', 'in').id).toBe('p-aux')
  })

  it('resolves a number as an index', () => {
    expect(resolvePin(MIX, 1, 'out').id).toBe('p-out')
  })

  it("resolves 'in'/'out' keywords to the first pin of that direction", () => {
    expect(resolvePin(MIX, 'in', 'in').id).toBe('p-in')
    expect(resolvePin(MIX, 'OUT', 'out').id).toBe('p-out')
  })

  it('undefined resolves to the only pin of the expected direction (single-pin default)', () => {
    const n = nodeOf([['only-in', 'in', 'X'], ['only-out', 'out', 'Y']])
    expect(resolvePin(n, undefined, 'out').id).toBe('only-out')
    expect(resolvePin(n, undefined, 'in').id).toBe('only-in')
  })
})

describe('resolvePin — failures (message strings are contract)', () => {
  it('unknown label throws listing available pins of the expected direction', () => {
    expect(() => resolvePin(MIX, 'Nope', 'out')).toThrow(
      /pin 'Nope' not found on node 'Mix' \(n1\)\. available out pins: \[0:Out\(float\)\]/,
    )
  })

  it('out-of-range numeric index throws the same shaped error', () => {
    expect(() => resolvePin(MIX, '9', 'in')).toThrow(/pin '9' not found on node 'Mix'/)
    expect(() => resolvePin(MIX, 9, 'in')).toThrow(/pin '9' not found on node 'Mix'/)
  })

  it('a label that matches a pin of the WRONG direction throws (no silent cross-direction resolves)', () => {
    // 'In' exists on the node, but we asked for an out pin — must NOT resolve to the in pin.
    expect(() => resolvePin(MIX, 'In', 'out')).toThrow(/available out pins:/)
  })

  it('undefined with several candidate pins throws listing them (unlabeled pins listed by id)', () => {
    expect(() => resolvePin(MIX, undefined, 'in')).toThrow(
      /pin reference was omitted but node 'Mix' \(n1\) has 2 in pins\. available in pins: \[0:In\(float\), 1:p-aux\(float\)\]/,
    )
  })

  it('undefined with zero candidate pins throws', () => {
    const n = nodeOf([['o', 'out', 'O']])
    expect(() => resolvePin(n, undefined, 'in')).toThrow(/available in pins: \[none\]|no in pins/)
  })

  it('direction keyword with no pin of that direction throws', () => {
    const n = nodeOf([['o', 'out', 'O']])
    expect(() => resolvePin(n, 'in', 'in')).toThrow(/not found on node/)
  })
})

describe('resolvePin — typing', () => {
  it('returns the narrowed pin type of the passed node (generic passthrough)', () => {
    interface MyPin extends ResolvablePin { extra: number }
    const n = {
      id: 'n2', type: 'T',
      pins: [{ id: 'a', kind: 'data' as const, direction: 'out' as const, type: 'float', label: 'A', extra: 7 }] as MyPin[],
    }
    const p = resolvePin<MyPin>(n, 'A', 'out')
    expect(p.extra).toBe(7)
  })
})
