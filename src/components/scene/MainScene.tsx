import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { Experience } from './Experience'
import { CAMERA_FOV, CAMERA_POSITION } from '@/cores/const/scene'
import styles from './MainScene.module.css'

// Canvas 有自己獨立的 render loop，跟 React 的 render 週期不同步——
// 裡面（Experience）裝的是 Three.js 的場景圖，不是 DOM。
export function MainScene() {
  return (
    <div className={styles.scene}>
      <Canvas
        shadows
        camera={{ position: CAMERA_POSITION, fov: CAMERA_FOV }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <Experience />
        </Suspense>
      </Canvas>
    </div>
  )
}
