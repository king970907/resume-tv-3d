import { useEffect } from 'react'
import { useControls } from 'leva'
import { DEFAULT_SCENE_TUNING } from '@/cores/const/sceneTuning'
import type { SceneTuning } from '@/cores/types/sceneTuning'

interface LightingControlsProps {
  onChange: (tuning: SceneTuning) => void
}

// 只在開發模式被 MainScene.tsx 動態 import（見那邊的 lazy()），正式
// build 完全不會打包進主要 chunk——leva 面板本身不需要塞進使用者實際
// 看到的網站。這個元件不回傳任何 JSX（leva 的面板是它自己 portal 到
// document.body，不需要我們手動渲染 <Leva/>），純粹只是把 useControls
// 讀到的即時數值，透過 onChange 回報給 MainScene.tsx 存成 state 再往下
// 傳給 Experience.tsx。
export function LightingControls({ onChange }: LightingControlsProps) {
  const t = DEFAULT_SCENE_TUNING

  const ambient = useControls('Lights.Ambient', {
    intensity: { value: t.ambient.intensity, min: 0, max: 3, step: 0.01 },
    color: t.ambient.color,
  })
  const key = useControls('Lights.Key', {
    intensity: { value: t.key.intensity, min: 0, max: 5, step: 0.01 },
    color: t.key.color,
    position: { value: t.key.position, step: 0.05 },
  })
  const fill = useControls('Lights.Fill', {
    intensity: { value: t.fill.intensity, min: 0, max: 3, step: 0.01 },
    color: t.fill.color,
    position: { value: t.fill.position, step: 0.05 },
  })
  const accent = useControls('Lights.Accent', {
    // 這顆是點光源，用 candela 單位，量級比方向光大很多（見
    // Experience.tsx 裡 ACCENT_LIGHT 相關註解），滑桿上限抓大一點。
    intensity: { value: t.accent.intensity, min: 0, max: 15, step: 0.05 },
    color: t.accent.color,
    position: { value: t.accent.position, step: 0.05 },
  })
  const rim = useControls('Lights.Rim', {
    intensity: { value: t.rim.intensity, min: 0, max: 3, step: 0.01 },
    color: t.rim.color,
    position: { value: t.rim.position, step: 0.05 },
  })
  const { fogColor, fogNear, fogFar } = useControls('Fog', {
    fogColor: { value: t.fog.color, label: 'color' },
    fogNear: { value: t.fog.near, min: 0, max: 10, step: 0.05, label: 'near' },
    fogFar: { value: t.fog.far, min: 0, max: 15, step: 0.05, label: 'far' },
  })
  const { background, floorColor } = useControls('Background', {
    background: t.background,
    floorColor: t.floorColor,
  })

  // leva 的值每次互動都會變，直接在 render 期間把它們組成 SceneTuning
  // 丟給 onChange——用 useEffect 而不是 render 期間直接呼叫，因為
  // onChange 最終會觸發 MainScene.tsx 的 setState，屬於「跟外部系統
  // （這裡的外部系統是父層 state）同步」，是 effect 該做的事，不是
  // render 期間的副作用。
  useEffect(() => {
    onChange({
      ambient,
      key,
      fill,
      accent,
      rim,
      fog: { color: fogColor, near: fogNear, far: fogFar },
      background,
      floorColor,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ambient, key, fill, accent, rim, fogColor, fogNear, fogFar, background, floorColor])

  return null
}
