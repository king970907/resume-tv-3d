// 場景燈光/霧/背景的可調參數——結構故意跟 Experience.tsx 原本那組
// `XXX_BASE_INTENSITY` 常數 + 寫死的 color/position JSX props 一一對應，
// 只是從「編譯期常數」改成「執行期資料」，才能被 LightingControls.tsx
// 的 leva 面板即時覆寫。DEFAULT_SCENE_TUNING（cores/const/sceneTuning.ts）
// 是原本那組數字的搬家，不是新調校。
export interface DirectionalLightTuning {
  intensity: number
  color: string
  position: [number, number, number]
}

export interface PointLightTuning {
  intensity: number
  color: string
  position: [number, number, number]
}

export interface AmbientLightTuning {
  intensity: number
  color: string
}

export interface FogTuning {
  color: string
  near: number
  far: number
}

export interface SceneTuning {
  ambient: AmbientLightTuning
  key: DirectionalLightTuning
  fill: DirectionalLightTuning
  accent: PointLightTuning
  rim: DirectionalLightTuning
  fog: FogTuning
  background: string
  floorColor: string
}
