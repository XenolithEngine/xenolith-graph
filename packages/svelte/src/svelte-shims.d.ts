// Ambient typing for .svelte imports from plain TS (our tsc typecheck and downstream JS
// consumers). Real prop types come from the .svelte sources themselves when the consumer's
// toolchain compiles them (the package ships source via the `svelte` export condition).
declare module '*.svelte' {
  import type { Component } from 'svelte'
  const component: Component<Record<string, any>>
  export default component
}
