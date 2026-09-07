import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { Vector3 } from 'three'
import type { Group } from 'three'
import { PROJECTS } from '@/data/projects'
import type { Project } from '@/cores/types/project'
import { DVD } from './DVD'
import {
  DVD_SELECTOR_ARC_SPACING,
  DVD_SELECTOR_DISTANCE,
  DVD_SELECTOR_FLY_DURATION,
  DVD_SELECTOR_SCALE,
} from '@/cores/const/interaction'

interface DVDSelectorProps {
  isOpen: boolean
  onSelect: (project: Project) => void
}

// 每片碟外面包一層 group，用 ref 抓住直接命令 position/scale——碟片要飛的
// 目標是「鏡頭前方」這個世界座標，跟盒子本身的姿態完全無關，所以這個元件
// 故意不是 DVDCase 的子物件，是 Experience 底下平行的另一個元件。
export function DVDSelector({ isOpen, onSelect }: DVDSelectorProps) {
  const camera = useThree((state) => state.camera)
  const discGroupRefs = useRef<(Group | null)[]>([])

  useEffect(() => {
    // 用「這次開啟當下」鏡頭的位置/朝向算一次扇形排列的目標點，不逐幀跟隨
    // ——Experience 那邊選片時會把 OrbitControls 鎖住，鏡頭不會在這段期間
    // 移動，算一次就夠用，不用每幀重算。
    const forward = new Vector3()
    camera.getWorldDirection(forward)
    const right = new Vector3().crossVectors(forward, camera.up).normalize()
    const center = camera.position.clone().add(forward.multiplyScalar(DVD_SELECTOR_DISTANCE))

    PROJECTS.forEach((_, i) => {
      const group = discGroupRefs.current[i]
      if (!group) return

      gsap.killTweensOf(group.position)
      gsap.killTweensOf(group.scale)

      if (isOpen) {
        const offset = (i - (PROJECTS.length - 1) / 2) * DVD_SELECTOR_ARC_SPACING
        const target = center.clone().add(right.clone().multiplyScalar(offset))

        // 面朝鏡頭：碟片沒有正反面材質差異（目前還是同一種灰色），朝向
        // 哪一面對著鏡頭現在看不出差別，先用 lookAt 對齊即可。
        group.lookAt(camera.position)
        group.visible = true

        gsap.fromTo(
          group.position,
          { x: camera.position.x, y: camera.position.y, z: camera.position.z },
          {
            x: target.x,
            y: target.y,
            z: target.z,
            duration: DVD_SELECTOR_FLY_DURATION,
            ease: 'back.out(1.4)',
          },
        )
        gsap.fromTo(
          group.scale,
          { x: 0.2, y: 0.2, z: 0.2 },
          {
            x: DVD_SELECTOR_SCALE,
            y: DVD_SELECTOR_SCALE,
            z: DVD_SELECTOR_SCALE,
            duration: DVD_SELECTOR_FLY_DURATION,
            ease: 'back.out(1.4)',
          },
        )
      } else {
        gsap.to(group.scale, {
          x: 0,
          y: 0,
          z: 0,
          duration: DVD_SELECTOR_FLY_DURATION * 0.6,
          ease: 'power2.in',
          onComplete: () => {
            group.visible = false
          },
        })
      }
    })
  }, [isOpen, camera])

  return (
    <>
      {PROJECTS.map((project, i) => (
        <group
          key={project.id}
          ref={(el) => { discGroupRefs.current[i] = el }}
          visible={false}
          scale={0}
        >
          <DVD project={project} onSelect={onSelect} />
        </group>
      ))}
    </>
  )
}
