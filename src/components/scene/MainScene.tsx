import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { Experience } from './Experience'
import styles from './MainScene.module.css'

// Canvas owns its own render loop, independent of React's render cycle —
// everything inside it (Experience) is Three.js scene graph, not DOM.
export function MainScene() {
  return (
    <div className={styles.scene}>
      <Canvas shadows camera={{ position: [0, 1.4, 4.5], fov: 45 }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <Experience />
        </Suspense>
      </Canvas>
    </div>
  )
}
