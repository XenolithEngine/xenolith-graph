import { createApp, h, reactive, type App, type Component } from 'vue'
import type { DomWidgetController } from '@xenolithengine/graph-editor'

/** Props every Vue-component widget receives. Plain (unwrapped) values — the underlying state is
 *  a `reactive` object so Vue tracks dependencies in the component template; consumers write
 *  idiomatic `{{ value }}` and `:style="{ color: accent }"` without any `.value` boilerplate. */
export interface WidgetProps {
  value: unknown
  setValue: (v: unknown) => void
  accent: string
  text:   string
  muted:  string
  width:  number
  height: number
}

/** Bridge a Vue 3 component into a XenolithGraph custom widget. Mirror of React's `reactWidget`.
 *  Usage:
 *
 *      import MyKnob from './MyKnob.vue'
 *      editor.registerWidget('knob', vueWidget(MyKnob))
 *
 *  Inside `MyKnob.vue`:
 *      defineProps<WidgetProps>()
 *      // template reads `value`, `accent`, etc. directly — no `.value`.
 *
 *  The widget instance gets a `reactive` props bag; mutating it on every `update(c)` triggers a
 *  template re-render. Only the actual props change — no re-mount, no re-create. */
export function vueWidget(Component: Component): DomWidgetController {
  let app: App | null = null
  // One reactive bag shared between mount + update; props bound by reference into the component.
  const state = reactive<WidgetProps>({
    value: undefined,
    setValue: () => {},
    accent: '', text: '', muted: '',
    width: 0, height: 0,
  })

  return {
    mount(el, c) {
      state.value = c.value
      state.setValue = c.setValue
      state.accent = c.accent; state.text = c.text; state.muted = c.muted
      state.width = c.width;   state.height = c.height
      // Pass the reactive bag itself as the props object — Vue spreads its keys onto the child
      // component's declared props at every render, picking up mutations from update() below.
      app = createApp({ render: () => h(Component as never, state as never) })
      app.mount(el)
      return () => { app?.unmount(); app = null }
    },
    update(c) {
      // `setValue` is only handed in at `mount` and is stable for the widget's lifetime — skip
      // it here (the type narrows: `update` receives plain `CustomWidgetContext`).
      state.value = c.value
      state.accent = c.accent; state.text = c.text; state.muted = c.muted
      state.width = c.width;   state.height = c.height
    },
  }
}
