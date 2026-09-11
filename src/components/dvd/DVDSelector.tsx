import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import gsap from 'gsap'
import { Vector3 } from 'three'
import type { Group, Mesh } from 'three'
import { PROJECTS } from '@/data/projects'
import type { Project } from '@/cores/types/project'
import { DVD } from './DVD'
import {
  DVD_SELECTOR_ARC_SPACING,
  DVD_SELECTOR_DISTANCE,
  DVD_SELECTOR_FLY_DURATION,
  DVD_SELECTOR_HOVER_SNAP_DURATION,
  DVD_SELECTOR_SCALE,
  DVD_SELECTOR_SPIN_SPEED_X,
  DVD_SELECTOR_SPIN_SPEED_Y,
} from '@/cores/const/interaction'

interface DVDSelectorProps {
  isOpen: boolean
  onSelect: (project: Project) => void
  // 點擊碟片以外的地方（黑色背景）要能取消選片——這個 callback 就是拿來
  // 關閉整個選片畫面用的，不選任何一片。
  onClose: () => void
}

// 選片開啟時蓋在碟片後面的一大片背板，接住「點擊碟片以外的地方」的事件。
// 位置比碟片扇形排列稍微遠一點，同一條鏡頭前方的射線上，這樣碟片本身
// 擋在前面優先被打中，點不到碟片的地方射線才會落到這片背板上。
const BACKDROP_DISTANCE_PAST_DISCS = 1
const BACKDROP_SIZE = 30

// 每片碟外面包兩層 group：
// - 外層（discGroupRefs）用 ref 抓住直接命令 position/scale/lookAt——碟片
//   要飛的目標是「鏡頭前方」這個世界座標，跟盒子本身的姿態完全無關，所以
//   這個元件故意不是 DVDCase 的子物件，是 Experience 底下平行的另一個元件。
// - 內層（spinGroupRefs）負責閒置自轉，跟外層的位置/朝向動畫分開算，不會
//   互相干擾：外層負責「面向鏡頭」，內層負責「原地慢慢轉」。
export function DVDSelector({ isOpen, onSelect, onClose }: DVDSelectorProps) {
  const camera = useThree((state) => state.camera)
  const discGroupRefs = useRef<(Group | null)[]>([])
  const spinGroupRefs = useRef<(Group | null)[]>([])
  const hoveredRef = useRef<boolean[]>(PROJECTS.map(() => false))
  const backdropRef = useRef<Mesh>(null)

  useEffect(() => {
    // 用「這次開啟當下」鏡頭的位置/朝向算一次扇形排列的目標點，不逐幀跟隨
    // ——Experience 那邊選片時會把 OrbitControls 鎖住，鏡頭不會在這段期間
    // 移動，算一次就夠用，不用每幀重算。
    const forward = new Vector3()
    camera.getWorldDirection(forward)
    const right = new Vector3().crossVectors(forward, camera.up).normalize()
    const center = camera.position.clone().add(forward.multiplyScalar(DVD_SELECTOR_DISTANCE))

    if (backdropRef.current) {
      if (isOpen) {
        const backdropCenter = camera.position
          .clone()
          .add(forward.clone().multiplyScalar(DVD_SELECTOR_DISTANCE + BACKDROP_DISTANCE_PAST_DISCS))
        backdropRef.current.position.copy(backdropCenter)
        backdropRef.current.lookAt(camera.position)
        backdropRef.current.visible = true
      } else {
        // visible = false 順便關掉這片的 raycast，關閉狀態下不會誤擋到
        // 場景其他物件（TV、player）原本的點擊。
        backdropRef.current.visible = false
      }
    }

    PROJECTS.forEach((_, i) => {
      const group = discGroupRefs.current[i]
      if (!group) return

      gsap.killTweensOf(group.position)
      gsap.killTweensOf(group.scale)

      if (isOpen) {
        const offset = (i - (PROJECTS.length - 1) / 2) * DVD_SELECTOR_ARC_SPACING
        const target = center.clone().add(right.clone().multiplyScalar(offset))

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

  // 閒置自轉——不受 hover 影響的碟片，每幀累加內層 group 的 rotation。
  // hover 中的碟片被排除在外（見下面 hoveredRef 判斷），讓它維持
  // handleHoverChange 轉正的角度，不會被這裡的累加蓋掉。
  useFrame((_, delta) => {
    if (!isOpen) return
    spinGroupRefs.current.forEach((group, i) => {
      if (!group || hoveredRef.current[i]) return
      group.rotation.x += delta * DVD_SELECTOR_SPIN_SPEED_X
      group.rotation.y += delta * DVD_SELECTOR_SPIN_SPEED_Y
    })
  })

  const handleHoverChange = (i: number) => (hovering: boolean) => {
    hoveredRef.current[i] = hovering
    const spinGroup = spinGroupRefs.current[i]
    if (!spinGroup) return

    // hover 時停止累加、轉正對鏡頭（回到 rotation 0，因為外層 group 已經
    // lookAt 鏡頭了，內層歸零角度疊上去就是「正面朝向鏡頭」）；放開游標
    // 不用轉回去，直接從目前角度繼續累加即可。
    if (hovering) {
      gsap.killTweensOf(spinGroup.rotation)
      gsap.to(spinGroup.rotation, {
        x: 0,
        y: 0,
        z: 0,
        duration: DVD_SELECTOR_HOVER_SNAP_DURATION,
        ease: 'power2.out',
      })
    }
  }

  const handleBackdropClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onClose()
  }

  return (
    <>
      {/* 預設不可見（visible=false 同時關掉 raycast），只有選片開啟時才
          出現在碟片後面接住其他點擊。 */}
      <mesh ref={backdropRef} visible={false} onClick={handleBackdropClick}>
        <planeGeometry args={[BACKDROP_SIZE, BACKDROP_SIZE]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {PROJECTS.map((project, i) => (
        <group
          key={project.id}
          ref={(el) => { discGroupRefs.current[i] = el }}
          visible={false}
          scale={0}
        >
          <group ref={(el) => { spinGroupRefs.current[i] = el }}>
            <DVD project={project} onSelect={onSelect} onHoverChange={handleHoverChange(i)} />
          </group>
        </group>
      ))}
    </>
  )
}
