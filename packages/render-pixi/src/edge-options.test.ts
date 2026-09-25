import { describe, it, expect } from 'vitest'
import { mergeEdgeOptions } from './edge-renderer.js'

describe('mergeEdgeOptions', () => {
  it('fills omitted fields from the default and lets an explicit field win', () => {
    expect(mergeEdgeOptions({ pathStyle: 'step', animated: true }, {})).toEqual({ pathStyle: 'step', animated: true })
    expect(mergeEdgeOptions({ pathStyle: 'step' }, { pathStyle: 'linear', sourceType: 'float' })).toEqual({
      pathStyle: 'linear',
      sourceType: 'float',
    })
  })
})
