import { mount, unmount, type Component } from 'svelte'
import { writable, type Writable } from 'svelte/store'
import WidgetShim from './WidgetShim.svelte'
import type { DomWidgetController } from '@xenolithengine/graph-editor'

/** Props every Svelte-component widget receives. Plain values — the underlying state is a store
 *  the bridge mutates, so the component re-renders on every `update()` without remounting. */
export interface WidgetProps {
  value: unknown
  setValue: (v: unknown) => void
  /** Opens the properties sidebar for the widget's node. */
  openSidebar: () => void
  accent: string
  text: string
  muted: string
  width: number
  height: number
}

/**
 * Bridge a Svelte 5 component into a XenolithGraph custom widget. Mirror of React's `reactWidget`
 * / Vue's `vueWidget`:
 *
 *     import MyKnob from './MyKnob.svelte'
 *     editor.registerWidget('knob', svelteWidget(MyKnob))
 *
 * Inside `MyKnob.svelte` declare `let { value, setValue, accent, … }: WidgetProps = $props()` and
 * use the props directly. The component mounts once per widget instance; `update()` mutates a
 * props store in place — no remount, no flicker, internal component state survives. Theme switches
 * push new accent/text/muted values through the same store. Requires Svelte 5 (runes); the action
 * and stores work on Svelte 4, the widget bridge does not.
 */
export function svelteWidget(Cmp: Component<Record<string, unknown>>): DomWidgetController {
  let app: ReturnType<typeof mount> | null = null
  let ctx: Writable<Record<string, unknown>> | null = null
  let setValue: (v: unknown) => void = () => {}
  let openSidebar: () => void = () => {}

  return {
    mount(el, c) {
      setValue = c.setValue
      openSidebar = c.openSidebar
      ctx = writable({
        value: c.value, setValue, openSidebar,
        accent: c.accent, text: c.text, muted: c.muted, width: c.width, height: c.height,
      })
      app = mount(WidgetShim, { target: el, props: { component: Cmp, ctx } })
      return () => { if (app) { unmount(app); app = null } }
    },
    update(c) {
      // setValue/openSidebar are only handed in at mount and stable for the widget's lifetime.
      ctx?.set({
        value: c.value, setValue, openSidebar,
        accent: c.accent, text: c.text, muted: c.muted, width: c.width, height: c.height,
      })
    },
  }
}
