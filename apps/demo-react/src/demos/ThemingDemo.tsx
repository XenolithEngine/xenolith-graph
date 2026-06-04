import { useState } from 'react'
import { XenolithGraph, XenolithPanel, XenolithButton, XenolithControls } from '@xenolithengine/graph-react'
import { xenTheme } from '@xenolithengine/graph-render-pixi'
import { liquidGlassTheme } from '@xenolithengine/graph-theme-liquid-glass'
import { DemoStage } from '../Layout.js'
import { loadDemo } from '../demo-data.js'

/** Island: theme is a reactive prop — flip Xen ⇄ Liquid Glass from an in-editor panel whose own
 *  buttons restyle with the theme via --xeno-*. */
export function ThemingDemo() {
  const [theme, setTheme] = useState<'xen' | 'lg'>('xen')
  return (
    <DemoStage>
      <XenolithGraph
        className="xeno"
        theme={theme === 'xen' ? xenTheme : liquidGlassTheme}
        resizeToWindow={false}
        onReady={loadDemo}
      >
        <XenolithControls position="top-right" orientation="horizontal" />
        <XenolithPanel position="top-left" style={{ display: 'flex', gap: 6, padding: 6 }}>
          <XenolithButton active={theme === 'xen'} onClick={() => setTheme('xen')}>Xen</XenolithButton>
          <XenolithButton active={theme === 'lg'} onClick={() => setTheme('lg')}>Liquid Glass</XenolithButton>
        </XenolithPanel>
      </XenolithGraph>
    </DemoStage>
  )
}
