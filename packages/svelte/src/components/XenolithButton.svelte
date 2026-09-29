<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    active?: boolean
    disabled?: boolean
    onclick?: (e: MouseEvent) => void
    style?: string
    children?: Snippet
    [key: string]: unknown
  }

  let { active = false, disabled = false, onclick, style = '', children, ...rest }: Props = $props()
</script>

<button
  type="button"
  data-xeno-button=""
  {disabled}
  {...rest}
  onclick={(e) => { if (!disabled) onclick?.(e) }}
  style={`font:inherit;font-size:13px;line-height:1;padding:7px 12px;cursor:${disabled ? 'default' : 'pointer'};opacity:${disabled ? '0.4' : '1'};border-radius:8px;border:1px solid ${active ? 'var(--xeno-accent)' : 'var(--xeno-border)'};background:${active ? 'var(--xeno-accent)' : 'var(--xeno-elevated)'};color:${active ? 'var(--xeno-canvas)' : 'var(--xeno-text)'};${style}`}
>
  {@render children?.()}
</button>
