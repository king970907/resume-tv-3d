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
import type { Project } from '@/cores/types/project'
import { DVD } from './DVD'

// 盒子裡的碟片純粹是裝飾——真正的資料在 DVDSelector 那組飄浮碟片裡。固定
// 一片，不要跟著 PROJECTS 數量長：疊太多片會像一疊沒對齊的百葉窗（3 片
// 就已經看得出一圈一圈的邊緣，4、5 片只會更明顯），而且盒子本來就不該
// 暗示「裡面裝著跟項目數量一樣多的碟」。
const DECORATIVE_DISC_PROJECT: Project = PROJECTS[0]

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
const DISC_Z = 0.002

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

      {/* 盒子裡靜靜躺著一片裝飾用的碟——真正拿來選的那組是 DVDSelector，
          開盒後在鏡頭前面用世界座標飛出來，不會被這個盒子的姿態影響。 */}
      <DVD project={DECORATIVE_DISC_PROJECT} position={[0, 0, DISC_Z]} />

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
