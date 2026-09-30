/** Editor `node:click` → DOM event `node-click`. One hyphen, so Solid's `on:node-click` is a
 *  single colon. `on:node:click` is two colons and Vite's esbuild dep scan rejects the JSX. */
export function solidEventName(event: string): string {
  return event.replace(':', '-')
}
