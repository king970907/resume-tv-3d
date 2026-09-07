import { useEffect, useRef, useState } from 'react'
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
  // 開闔狀態要讓 Experience.tsx 知道——碟片真正的選片畫面（DVDSelector）
  // 是獨立在盒子姿態之外的世界座標飛出來的，不能只在這個元件內部處理。
  onOpenChange?: (isOpen: boolean) => void
}

// 封底這個 box 中心在 z = -DEPTH/4、半厚度 DEPTH/4，所以前面那個面（朝向
// 開闔方向、鏡頭看得到的那面）落在 z = 0。碟片要貼在這個面前面一點點，
// 不是貼在封底的幾何中心——中心是實心的，放在那裡碟片會被整個蓋子擋住。
const DISC_BASE_Z = 0.002
const DISC_Z_STEP = 0.002 // 每片往前疊一點點，避免完全共平面 z-fighting
const DISC_X_SPACING = 0.05 // 沿寬度方向扇開一點，讓每片碟的中心點分開，方便個別點擊

export function DVDCase({ onOpenChange }: DVDCaseProps) {
  const coverPivotRef = useRef<Group>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const pivot = coverPivotRef.current
    return () => {
      if (pivot) gsap.killTweensOf(pivot.rotation)
    }
  }, [])

  const handleToggleOpen = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    const pivot = coverPivotRef.current
    if (!pivot) return

    gsap.killTweensOf(pivot.rotation)
    const next = !isOpen
    setIsOpen(next)
    onOpenChange?.(next)
    gsap.to(pivot.rotation, {
      y: next ? DVD_CASE_OPEN_ANGLE : 0,
      duration: DVD_CASE_OPEN_DURATION,
      ease: 'power2.out',
    })
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
