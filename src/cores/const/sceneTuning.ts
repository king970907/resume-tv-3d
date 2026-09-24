import type { SceneTuning } from '@/cores/types/sceneTuning'

// 場景燈光/霧/背景的預設值——直接照搬 Experience.tsx 原本那組寫死的
// 常數/JSX props，數字本身沒有變，只是搬到這裡當 LightingControls.tsx
// 的 leva 面板初始值、也是 <LightingControls> 沒掛載時（production
// build）Experience.tsx 實際使用的值。每個燈光的用途說明留在
// Experience.tsx 對應的 JSX 註解，這裡不重複。
export const DEFAULT_SCENE_TUNING: SceneTuning = {
  ambient: { intensity: 0.45, color: '#3a3226' },
  key: { intensity: 1.6, color: '#ffd9a8', position: [0.6, 1.2, 0.8] },
  fill: { intensity: 0.6, color: '#cfd8e8', position: [0, 0.35, 1.2] },
  accent: { intensity: 4, color: '#5aa9e6', position: [-0.6, 0.5, -0.4] },
  rim: { intensity: 0.5, color: '#aab8c2', position: [0.3, 1.1, -1.2] },
  fog: { color: '#0a0a0a', near: 2.2, far: 4 },
  background: '#0a0a0a',
  floorColor: '#1a1a1a',
}
