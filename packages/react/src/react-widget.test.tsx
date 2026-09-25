/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest'
import { flushSync } from 'react-dom'
import { reactWidget, type WidgetProps } from './react-widget.js'

describe('reactWidget', () => {
  it('hands openSidebar through to the component', () => {
    let seen: WidgetProps['openSidebar'] | undefined
    const el = document.createElement('div')
    document.body.appendChild(el)
    const openSidebar = () => {}
    const widget = reactWidget((props) => { seen = props.openSidebar; return null })
    flushSync(() => {
      widget.mount(el, {
        value: 1, node: { id: 'n' } as never, width: 10, height: 10,
        accent: '#fff', text: '#fff', muted: '#aaa',
        setValue: () => {},
        openSidebar,
      })
    })
    expect(seen).toBe(openSidebar)
  })
})
