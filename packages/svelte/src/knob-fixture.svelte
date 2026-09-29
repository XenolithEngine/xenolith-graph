<script lang="ts">
  // Test-fixture widget: renders the streamed props so the bridge contract is observable.
  let { value, accent, width, setValue }: { value: unknown; accent: string; width: number; setValue: (v: unknown) => void } = $props()
</script>

<label data-knob style={`color:${accent};width:${width}px`}>
  <span data-value>{String(value)}</span>
  <button data-bump onclick={() => setValue((value as number) + 1)}>+</button>
</label>
