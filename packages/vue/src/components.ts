import {
  Teleport, computed, defineComponent, h, normalizeStyle, onUnmounted, watch,
  type PropType, type StyleValue, type VNode,
} from 'vue'
import type { ControlsOptions, MinimapPosition } from '@xenolithengine/graph-editor'
import { useEditor, useEditorReady } from './index.js'

export type PanelPosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'

const POS: Record<PanelPosition, Record<string, string | number>> = {
  'top-left':      { top: '12px', left: '12px' },
  'top-center':    { top: '12px', left: '50%', transform: 'translateX(-50%)' },
  'top-right':     { top: '12px', right: '12px' },
  'bottom-left':   { bottom: '12px', left: '12px' },
  'bottom-center': { bottom: '12px', left: '50%', transform: 'translateX(-50%)' },
  'bottom-right':  { bottom: '12px', right: '12px' },
}

/**
 * `<XenolithPanel position="top-right">` — Vue equivalent of React `<XenolithPanel>`.
 * Anchors children inside the editor's overlay layer via `<Teleport>`, so panels live "in" the
 * graph and inherit the theme's `--xeno-*` vars. `bare` drops the frosted card chrome and only
 * positions the slot.
 */
export const XenolithPanel = defineComponent({
  name: 'XenolithPanel',
  props: {
    position: { type: String as PropType<PanelPosition>, default: 'top-left' },
    bare: { type: Boolean, default: false },
  },
  setup(props, { slots }) {
    const editor = useEditor()
    return () => {
      const e = editor.value
      if (!e) return null
      const chrome: Record<string, string | number> = props.bare ? {} : {
        background: 'var(--xeno-panel)',
        border: '1px solid var(--xeno-border)',
        borderRadius: '10px',
        padding: '10px',
        color: 'var(--xeno-text)',
        boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
      }
      const style = { position: 'absolute', pointerEvents: 'auto', ...POS[props.position], ...chrome }
      return h(Teleport, { to: e.chrome.overlayRoot } as never,
        h('div', { 'data-xeno-panel': '', style }, slots['default']?.()))
    }
  },
})

/**
 * `<XenolithButton :active="...">` — themed button using the editor's `--xeno-*` vars (gold in
 * Xen, cyan in Liquid Glass — switches with the theme for free). Use inside `<XenolithPanel>` /
 * `<XenolithControls>`. Forwards `disabled`, `@click`, etc.
 */
export const XenolithButton = defineComponent({
  name: 'XenolithButton',
  props: {
    active: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
  },
  emits: ['click'],
  setup(props, { slots, emit, attrs }) {
    return () => h('button', {
      type: 'button',
      'data-xeno-button': '',
      disabled: props.disabled,
      onClick: (e: MouseEvent) => { if (!props.disabled) emit('click', e) },
      // `normalizeStyle([base, attrs.style])` merges deep — host `:style="{marginLeft:6}"`
      // composes with the built-in look instead of clobbering it.
      style: normalizeStyle([{
        font: 'inherit',
        fontSize: '13px',
        lineHeight: '1',
        padding: '7px 12px',
        cursor: props.disabled ? 'default' : 'pointer',
        opacity: props.disabled ? '0.4' : '1',
        borderRadius: '8px',
        border: `1px solid ${props.active ? 'var(--xeno-accent)' : 'var(--xeno-border)'}`,
        background: props.active ? 'var(--xeno-accent)' : 'var(--xeno-elevated)',
        color: props.active ? 'var(--xeno-canvas)' : 'var(--xeno-text)',
      }, attrs['style'] as StyleValue]),
    }, slots['default']?.())
  },
})

/**
 * `<XenolithControls :show-zoom="false" position="bottom-right" />` — declarative wrapper over
 * `editor.chrome.setControls`. Renders no DOM of its own; the toolbar lives in the editor's
 * overlayRoot and is shared across frameworks. Unmount → toolbar removed.
 */
export const XenolithControls = defineComponent({
  name: 'XenolithControls',
  props: {
    position:     { type: String as PropType<ControlsOptions['position']>,    default: undefined },
    orientation:  { type: String as PropType<ControlsOptions['orientation']>, default: undefined },
    zoomStep:     { type: Number, default: undefined },
    showZoom:     { type: Boolean, default: undefined },
    showFit:      { type: Boolean, default: undefined },
    showReset:    { type: Boolean, default: undefined },
    showHistory:  { type: Boolean, default: undefined },
    showSave:     { type: Boolean, default: undefined },
    showLock:     { type: Boolean, default: undefined },
    showInsert:   { type: Boolean, default: undefined },
  },
  setup(props): () => VNode | null {
    const editor = useEditor()
    const opts = computed<ControlsOptions>(() => {
      const o: ControlsOptions = {}
      if (props.position    !== undefined) o.position    = props.position
      if (props.orientation !== undefined) o.orientation = props.orientation
      if (props.zoomStep    !== undefined) o.zoomStep    = props.zoomStep
      if (props.showZoom    !== undefined) o.showZoom    = props.showZoom
      if (props.showFit     !== undefined) o.showFit     = props.showFit
      if (props.showReset   !== undefined) o.showReset   = props.showReset
      if (props.showHistory !== undefined) o.showHistory = props.showHistory
      if (props.showSave    !== undefined) o.showSave    = props.showSave
      if (props.showLock    !== undefined) o.showLock    = props.showLock
      if (props.showInsert  !== undefined) o.showInsert  = props.showInsert
      return o
    })
    useEditorReady((e) => {
      e.chrome.setControls(opts.value)
      return () => e.chrome.setControls(false)
    })
    watch(opts, (o) => { editor.value?.chrome.setControls(o) })
    onUnmounted(() => { editor.value?.chrome.setControls(false) })
    return () => null
  },
})

/**
 * `<XenolithMiniMap position="bottom-right" />` — declarative minimap toggle. Mounted → visible
 * with the given anchor; unmounted → hidden. Renders no DOM of its own (minimap is WebGL).
 */
export const XenolithMiniMap = defineComponent({
  name: 'XenolithMiniMap',
  props: {
    position: { type: String as PropType<MinimapPosition>, default: 'bottom-right' },
  },
  setup(props): () => VNode | null {
    const editor = useEditorReady((e) => {
      e.chrome.setMinimapVisible(true)
      e.chrome.setMinimapPosition(props.position as MinimapPosition)
      return () => e.chrome.setMinimapVisible(false)
    })
    watch(() => props.position, (pos) => {
      editor.value?.chrome.setMinimapPosition(pos as MinimapPosition)
    })
    return () => null
  },
})
