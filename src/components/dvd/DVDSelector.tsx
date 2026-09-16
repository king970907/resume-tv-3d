import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import gsap from 'gsap'
import { Vector3 } from 'three'
import type { Group, Mesh } from 'three'
import { PROJECTS } from '@/data/projects'
import type { Project } from '@/cores/types/project'
import { DVD_TRAY_INSERT_POSITION } from '@/cores/const/scene'
import { DVD } from './DVD'
import {
  DVD_INSERT_FLY_DURATION,
  DVD_INSERT_SCALE_END,
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
  // 選片後、正在把選中的碟片放進 DVD player 的期間，這裡是那個 project
  // 的 id，其餘時間是 null。跟 isOpen 是分開的兩個維度：isOpen 決定「一般
  // 的開/收扇形排列」，這個 prop 只在 isOpen 已經變 false 之後，決定
  // 「收起來的那一片要不要走特殊的飛向 player 動畫，而不是跟其他片一樣
  // 直接原地縮小消失」。
  insertingProjectId: string | null
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
export function DVDSelector({ isOpen, insertingProjectId, onSelect, onClose }: DVDSelectorProps) {
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

    // 背板現在只在 isOpen 時才掛載（見 JSX），isOpen 變 false 的當下它就
    // 已經從場景圖移除、ref 也跟著清空了，這裡不用再處理「關閉時怎麼藏
    // 起來」——不存在的東西不用藏。
    if (isOpen && backdropRef.current) {
      const backdropCenter = camera.position
        .clone()
        .add(forward.clone().multiplyScalar(DVD_SELECTOR_DISTANCE + BACKDROP_DISTANCE_PAST_DISCS))
      backdropRef.current.position.copy(backdropCenter)
      backdropRef.current.lookAt(camera.position)
    }

    PROJECTS.forEach((project, i) => {
      const group = discGroupRefs.current[i]
      if (!group) return

      gsap.killTweensOf(group.position)
      gsap.killTweensOf(group.scale)

      if (isOpen) {
        const offset = (i - (PROJECTS.length - 1) / 2) * DVD_SELECTOR_ARC_SPACING
        const target = center.clone().add(right.clone().multiplyScalar(offset))

        // 不能用 Object3D.lookAt()——那個對齊的是物件本地的 -Z 軸，但 DVD
        // 光碟實際的正面法向量是本地 +Y 軸，不是 Z（見 DVD.tsx 的說明：
        // Blender 端光碟是 Z-up 座標系裡「躺平」的物件，glTF 匯出時
        // Blender 的 Z 軸對應到 three.js 的 Y 軸，不是原本誤植的 Z 軸；
        // DVD.tsx 內部那個 180° 翻面只解決了「標籤面朝哪一邊」，沒有把
        // 法向量本身從 Y 轉到 Z）。實測過：用 lookAt() 的結果是光碟幾乎
        // 側面對著鏡頭（只看得到一條邊緣的細線），跟 DVD 本體疊在鏡頭
        // 視線的水平面上時尤其明顯。改成手動算一個「本地 +Y 對齊到鏡頭
        // 方向」的四元數，才會是碟片整個圓面朝向鏡頭。
        //
        // 方向要用 target（這次動畫最終停留的位置）算，不是用 group 當下
        // （可能還在原地或上次收起來的位置）算——朝向只在這裡設一次，
        // 之後飛行動畫只改 position/scale，角度要先對準最終停下來的地方。
        const towardCamera = camera.position.clone().sub(target).normalize()
        group.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), towardCamera)
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
      } else if (insertingProjectId === project.id) {
        // 選片後被挑中的那一片——跟其他片一起收起來時，不是原地縮小消失，
        // 是飛向 DVD player 的 tray（DVD_TRAY_INSERT_POSITION，世界座標，
        // 跟盒子/鏡頭都無關，見 scene.ts 的說明），同時從選片時放大的
        // DVD_SELECTOR_SCALE 縮回接近原始尺寸——真的放進 player 的碟片
        // 不該還維持選片時誇張的放大尺寸。這裡不用管 tray 開/關的時機，
        // 那是 Experience.tsx 另外排的時間軸，這裡只負責飛過去、縮小、
        // 到位後隱藏。
        gsap.to(group.position, {
          x: DVD_TRAY_INSERT_POSITION[0],
          y: DVD_TRAY_INSERT_POSITION[1],
          z: DVD_TRAY_INSERT_POSITION[2],
          duration: DVD_INSERT_FLY_DURATION,
          ease: 'power2.in',
        })
        gsap.to(group.scale, {
          x: DVD_INSERT_SCALE_END,
          y: DVD_INSERT_SCALE_END,
          z: DVD_INSERT_SCALE_END,
          duration: DVD_INSERT_FLY_DURATION,
          ease: 'power2.in',
          onComplete: () => {
            group.visible = false
          },
        })
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
  }, [isOpen, insertingProjectId, camera])

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
    // 對齊鏡頭方向了，內層歸零角度疊上去就是「正面朝向鏡頭」）；放開游標
    // 不用轉回去，直接從目前角度繼續累加即可。
    if (hovering) {
      // rotation.x/y 是每幀累加、沒有 wrap 回 [0, 2π) ——閒置轉久一點
      // （例如碟片飛出來放著沒人動超過一圈半），數值可能已經是 6、8 甚至
      // 更大。直接 tween 到 0 會讓 gsap 照數字大小硬轉那麼多圈才會停，
      // 使用者會看到碟片瞬間狂轉一大圈才定住，畫面在轉的過程中會經過
      // 各種奇怪的側面角度，看起來像壞掉（實測過，回報「hover 變成很怪
      // 的形狀」正是這個原因，不是單純的朝向搞錯）。先把數值 wrap 到
      // 數學上等價、但落在 [-π, π] 內最接近 0 的角度，tween 才會是一段
      // 不超過半圈的最短路徑，瞬間定住的視覺效果不會經過奇怪的中間角度。
      const wrapToNearestZero = (angle: number) => {
        const twoPi = Math.PI * 2
        const wrapped = ((angle % twoPi) + twoPi) % twoPi
        return wrapped > Math.PI ? wrapped - twoPi : wrapped
      }
      spinGroup.rotation.x = wrapToNearestZero(spinGroup.rotation.x)
      spinGroup.rotation.y = wrapToNearestZero(spinGroup.rotation.y)

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
      {/* 只有選片開啟時才掛載——react-three-fiber 的事件系統是在物件掛載、
          handler 註冊的當下就把它記進可被 raycast 命中的清單，之後不會
          因為 visible 變 false 就跳過，跟 DOM 的「display:none 元素不會
          收到點擊」是兩回事（實測過：把這片背板留著只是切 visible，選片
          從沒開過、backdropRef 也還沒被下面的 effect 定位過，它就停在
          預設 position(0,0,0)、30x30 那麼大的一片，直接把 TV/DVD player/
          DVD 盒罩住，只要點擊沒有精準命中那些物件自己的可點擊範圍，這片
          隱形背板就會搶先接住，呼叫 onClose()——選片本來就是關的，
          onClose 等於沒作用，使用者只會看到「點了沒反應」。收起來後也
          一樣：position 停在上次選片時鏡頭前方的位置，沒有跟著歸位，
          同一塊區域會繼續擋著後續點擊。改成整個元件只在 isOpen 時才
          掛載，關閉時直接從場景圖移除，這樣才是真的「不會被點到」，不是
          只是「看不到但還擋著」。 */}
      {isOpen && (
        <mesh ref={backdropRef} onClick={handleBackdropClick}>
          <planeGeometry args={[BACKDROP_SIZE, BACKDROP_SIZE]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
      )}

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
