<script lang="ts">
  import type { WidgetProps } from '@xenolithengine/graph-svelte/components'

  const FRUITS = ['Apple', 'Apricot', 'Banana', 'Blueberry', 'Cherry', 'Date', 'Fig', 'Grape', 'Kiwi', 'Lemon', 'Mango', 'Orange', 'Peach', 'Pear', 'Plum', 'Raspberry', 'Strawberry', 'Watermelon']
  function fakeSearch(q: string): Promise<string[]> {
    return new Promise((res) => setTimeout(() => res(FRUITS.filter((f) => f.toLowerCase().includes(q.toLowerCase())).slice(0, 6)), 350))
  }

  let { value, setValue }: WidgetProps = $props()
  let q = $state('')
  let open = $state(false)
  let loading = $state(false)
  let opts = $state<string[]>([])
  let timer: ReturnType<typeof setTimeout> | undefined

  $effect(() => {
    const query = q
    const isOpen = open
    clearTimeout(timer)
    if (!isOpen) return
    loading = true
    timer = setTimeout(() => { void fakeSearch(query).then((rows) => { opts = rows; loading = false }) }, 250)
    return () => clearTimeout(timer)
  })
</script>

<div style="position:relative;width:100%;height:100%;">
  <input
    placeholder="Search fruit…"
    value={open ? q : String(value ?? '')}
    style="width:100%;box-sizing:border-box;font:inherit;font-size:12px;padding:4px 6px;border-radius:6px;border:1px solid var(--xeno-border);background:var(--xeno-bg);color:var(--xeno-text);"
    onfocus={() => { open = true; q = '' }}
    onblur={() => setTimeout(() => { open = false }, 150)}
    oninput={(e) => { q = (e.target as HTMLInputElement).value }}
  />
  {#if open}
    <div style="position:absolute;left:0;right:0;top:100%;z-index:5;margin-top:2px;background:var(--xeno-panel);border:1px solid var(--xeno-border);border-radius:6px;overflow:hidden;">
      {#if loading}
        <div style="padding:4px 8px;font-size:12px;color:var(--xeno-muted);">Searching…</div>
      {:else if opts.length === 0}
        <div style="padding:4px 8px;font-size:12px;color:var(--xeno-muted);">No matches</div>
      {:else}
        {#each opts as name}
          <div
            style="padding:4px 8px;font-size:12px;cursor:pointer;color:var(--xeno-text);"
            onmousedown={(e) => { e.preventDefault(); setValue(name); open = false }}
          >{name}</div>
        {/each}
      {/if}
    </div>
  {/if}
</div>
