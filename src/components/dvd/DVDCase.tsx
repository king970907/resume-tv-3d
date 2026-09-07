import { useEffect, useRef } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import gsap from 'gsap'
import type { Group } from 'three'
import {
  DVD_CASE_DEPTH,
  DVD_CASE_HEIGHT,
  DVD_CASE_REST_POSITION,
  DVD_CASE_REST_ROTATION,
  DVD_CASE_WIDTH,
} from '@/cores/const/scene'
import { DVD_CASE_OPEN_ANGLE, DVD_CASE_OPEN_DURATION } from '@/cores/const/interaction'
import { PROJECTS } from '@/data/projects'
import { DVD } from './DVD'

interface DVDCaseProps {
  // 受控元件——開闔狀態由 Experience.tsx 統一管理（跟 DVDSelector 共用
  // 同一個布林值），這樣選片畫面收起來的時候，盒子會自動跟著關，不用
  // 額外同步兩個各自獨立的開關狀態。
  isOpen: boolean
  onToggle: () => void
}

// 封底這個 box 中心在 z = -DEPTH/4、半厚度 DEPTH/4，所以前面那個面（朝向
// 開闔方向、鏡頭看得到的那面）落在 z = 0。碟片要貼在這個面前面一點點，
// 不是貼在封底的幾何中心——中心是實心的，放在那裡碟片會被整個蓋子擋住。
const DISC_BASE_Z = 0.002
const DISC_Z_STEP = 0.002 // 每片往前疊一點點，避免完全共平面 z-fighting
const DISC_X_SPACING = 0.05 // 沿寬度方向扇開一點，讓每片碟的中心點分開，方便個別點擊

export function DVDCase({ isOpen, onToggle }: DVDCaseProps) {
  const coverPivotRef = useRef<Group>(null)

  useEffect(() => {
    const pivot = coverPivotRef.current
    if (!pivot) return
    gsap.killTweensOf(pivot.rotation)
    gsap.to(pivot.rotation, {
      y: isOpen ? DVD_CASE_OPEN_ANGLE : 0,
      duration: DVD_CASE_OPEN_DURATION,
      ease: 'power2.out',
    })
  }, [isOpen])

  useEffect(() => {
    const pivot = coverPivotRef.current
    return () => {
      if (pivot) gsap.killTweensOf(pivot.rotation)
    }
  }, [])

  const handleToggleOpen = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onToggle()
  }

  return (
    <group name="dvd-case-rest" position={DVD_CASE_REST_POSITION} rotation={DVD_CASE_REST_ROTATION}>
      <mesh
        name="dvd-case-back-cover"
        position={[0, 0, -DVD_CASE_DEPTH / 4]}
        castShadow
        receiveShadow
        onClick={handleToggleOpen}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'default' }}
      >
        <boxGeometry args={[DVD_CASE_WIDTH, DVD_CASE_HEIGHT, DVD_CASE_DEPTH / 2]} />
        <meshStandardMaterial color="#3a3a4e" roughness={0.3} />
      </mesh>

      {/* 盒子裡靜靜躺著當裝飾用的碟片——真正拿來選的那組是 DVDSelector，
          開盒後在鏡頭前面用世界座標飛出來，不會被這個盒子的姿態影響。 */}
      {PROJECTS.map((project, i) => (
        <DVD
          key={project.id}
          project={project}
          position={[
            (i - (PROJECTS.length - 1) / 2) * DISC_X_SPACING,
            0,
            DISC_BASE_Z + i * DISC_Z_STEP,
          ]}
        />
      ))}

      <group
        name="dvd-case-front-cover-pivot"
        ref={coverPivotRef}
        position={[-DVD_CASE_WIDTH / 2, 0, DVD_CASE_DEPTH / 4]}
      >
        <mesh
          name="dvd-case-front-cover"
          position={[DVD_CASE_WIDTH / 2, 0, 0]}
          castShadow
          receiveShadow
          onClick={handleToggleOpen}
          onPointerOver={() => { document.body.style.cursor = 'pointer' }}
          onPointerOut={() => { document.body.style.cursor = 'default' }}
        >
          <boxGeometry args={[DVD_CASE_WIDTH, DVD_CASE_HEIGHT, DVD_CASE_DEPTH / 2]} />
          <meshStandardMaterial color="#4a4a60" roughness={0.3} />
        </mesh>
      </group>
    </group>
  )
}
