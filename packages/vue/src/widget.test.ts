// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { defineComponent } from 'vue'
import { vueWidget } from './widget.js'

describe('vueWidget', () => {
  it('hands openSidebar through to the component props', () => {
    let seen: (() => void) | undefined
    const Comp = defineComponent({
      props: ['value', 'setValue', 'openSidebar', 'accent', 'text', 'muted', 'width', 'height'],
      setup(props) { seen = props.openSidebar as () => void },
      template: '<button />',
    })
    const el = document.createElement('div')
    const openSidebar = () => {}
    vueWidget(Comp).mount(el, {
      value: 1, node: { id: 'n' } as never, width: 10, height: 10,
      accent: '#fff', text: '#fff', muted: '#aaa',
      setValue: () => {},
      openSidebar,
    })
    expect(seen).toBe(openSidebar)
  })
})
