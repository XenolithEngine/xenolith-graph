// React island router for /learn/<id> pages. Mirrors examples/ReactExample.tsx so the wrapper
// (className="app" + absolute fill) and `xeno:reset` remount behaviour stay identical — the
// .xeno class in demo-react/styles.css is scoped under .app, without which the editor div is
// 0×0 and the PIXI canvas renders into nothing.
import { useEffect, useState, type ReactElement, type ComponentType } from 'react'
import '../../../demo-react/src/styles.css'
import { Chapter01 } from '../../../demo-react/src/tutorial/Chapter01'
import { Chapter02 } from '../../../demo-react/src/tutorial/Chapter02'
import { Chapter03 } from '../../../demo-react/src/tutorial/Chapter03'
import { Chapter04 } from '../../../demo-react/src/tutorial/Chapter04'
import { Chapter05 } from '../../../demo-react/src/tutorial/Chapter05'
import { Chapter06 } from '../../../demo-react/src/tutorial/Chapter06'
import { Chapter07 } from '../../../demo-react/src/tutorial/Chapter07'
import { Chapter08 } from '../../../demo-react/src/tutorial/Chapter08'

const MAP: Record<string, ComponentType> = {
  '01-mount': Chapter01,
  '02-register-schema': Chapter02,
  '03-connect-edges': Chapter03,
  '04-widgets': Chapter04,
  '05-events': Chapter05,
  '06-save-load': Chapter06,
  '07-run-graph': Chapter07,
  '08-make-it-yours': Chapter08,
}

export default function TutorialReactChapter({ id }: { id: string }): ReactElement | null {
  const [nonce, setNonce] = useState(0)
  useEffect(() => {
    const onReset = (e: Event): void => {
      const detail = (e as CustomEvent<{ id?: string }>).detail
      if (!detail?.id || detail.id === id) setNonce((n) => n + 1)
    }
    document.addEventListener('xeno:reset', onReset)
    return () => document.removeEventListener('xeno:reset', onReset)
  }, [id])
  const Cmp = MAP[id]
  if (!Cmp) return null
  return (
    <div key={nonce} className="app" style={{ position: 'absolute', inset: 0, display: 'flex', height: 'auto' }}>
      <Cmp />
    </div>
  )
}
