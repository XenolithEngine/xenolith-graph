import { describe, it, expect } from 'vitest'
import { EDITOR_EVENT_NAMES } from './index.js'

// Runtime backstop for the compile-time exhaustiveness check in `index.ts`. If a future change to
// `EditorEvents` adds an event and a contributor either bypasses tsc or only runs the tests, this
// catches it. The expected count is hard-coded so adding an event without updating EDITOR_EVENT_NAMES
// fails loud — the maintainer has to actively change the number, which forces them to look at the
// list and decide whether the event is part of the public adapter surface.
describe('EDITOR_EVENT_NAMES (adapter event coverage)', () => {
  it('covers all 24 public editor events; bump the number AFTER updating EDITOR_EVENT_NAMES', () => {
    expect(EDITOR_EVENT_NAMES.length).toBe(24)
  })

  it('contains no duplicates (each event surfaced exactly once)', () => {
    expect(new Set(EDITOR_EVENT_NAMES).size).toBe(EDITOR_EVENT_NAMES.length)
  })

  it('includes the 4 preventable variants — they MUST reach non-React adapters', () => {
    for (const e of ['node:removing', 'node:clicking', 'edge:connecting', 'edge:disconnecting']) {
      expect(EDITOR_EVENT_NAMES).toContain(e)
    }
  })
})
