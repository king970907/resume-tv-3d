import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import gsap from 'gsap'
import { Quaternion, Vector3 } from 'three'
import type { Group, Mesh } from 'three'
import { PROJECTS } from '@/data/projects'
import type { Project } from '@/cores/types/project'
import { DVD_TRAY_INSERT_POSITION } from '@/cores/const/scene'
import { DVD } from './DVD'
import {
  DVD_INSERT_DROP_DURATION,
  DVD_INSERT_FLY_DURATION,
  DVD_INSERT_HOVER_HEIGHT,
  DVD_INSERT_SCALE_END,
  DVD_INSERT_SHRINK_DURATION,
  DVD_SELECTOR_ARC_SPACING,
  DVD_SELECTOR_DISTANCE,
  DVD_SELECTOR_FLY_DURATION,
  DVD_SELECTOR_HOVER_SNAP_DURATION,
  DVD_SELECTOR_RETRACT_DURATION,
  DVD_SELECTOR_SCALE,
  DVD_SELECTOR_SPIN_SPEED_X,
  DVD_SELECTOR_SPIN_SPEED_Y,
} from '@/cores/const/interaction'

// 角度累加久了會是很大的數字（閒置自轉從不 wrap 回 [0,2π)），直接 tween
// 到 0 會被 gsap 照數字大小硬轉那麼多圈——跟 handleHoverChange 轉正時
// 踩過的坑一樣，先 wrap 到數學上等價、落在 [-π, π] 內最接近 0 的角度，
// tween 才會是一段不超過半圈的最短路徑。兩個地方都要用，抽成共用函式。
function wrapToNearestZero(angle: number): number {
  const twoPi = Math.PI * 2
  const wrapped = ((angle % twoPi) + twoPi) % twoPi
  return wrapped > Math.PI ? wrapped - twoPi : wrapped
}

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
  // 記錄「放片 timeline 已經幫這片碟片開始了」——insertingProjectId 這個
  // prop 在整段放片流程中維持同一個值不變，但下面這個 effect 的依賴之一
  // （isOpen/discsReady）在流程開始當下會先是過渡用的舊值、再變成同步後
  // 的新值，同一個 insertingProjectId 期間 effect 因此會連續 re-run 兩次
  // （見下面 effect 內的長註解）。如果每次 re-run 都不分青紅皂白重新對
  // 這片碟片 gsap.killTweensOf + 建一個新 timeline，第一個 timeline的
  // position/scale tween 會被第二次的 killTweensOf 砍斷——被砍斷的 tween
  // 會直接從 timeline 移除，导致 timeline 自己算出來的總長度跟著縮短，
  // 使第一個 timeline 的 onComplete（把碟片 visible 設 false）在正確的
  // 放下動畫還沒播完時就提前觸發，碟片會在半空中直接消失，不是真的放到
  // 插槽裡才消失。用這個 ref 記住「這個 index 的碟片已經在跑放片 timeline
  // 了」，同一個 insertingProjectId 期間第二次 re-run 直接跳過，讓第一個
  // timeline 完整跑完，不要重新殺一次 tween、建一個新的。
  const insertStartedRef = useRef<boolean[]>(PROJECTS.map(() => false))

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

      // 放片 timeline 一旦為這片碟片開始了，就不要再被同一個
      // insertingProjectId 期間的第二次 effect re-run 打斷——見上面
      // insertStartedRef 宣告處的說明。直接 return，連 killTweensOf 都
      // 不做，讓已經在跑的 timeline 自己跑完、自己在 onComplete 收尾。
      if (insertingProjectId === project.id && insertStartedRef.current[i]) {
        return
      }
      // 碟片不再是「正在放片」的那一片（放片流程還沒開始，或已經結束回到
      // null）——重置旗標，下次這片被選中時才能重新啟動放片 timeline。
      if (insertingProjectId !== project.id) {
        insertStartedRef.current[i] = false
      }

      gsap.killTweensOf(group.position)
      gsap.killTweensOf(group.scale)

      // isOpen 這個 prop（Experience.tsx 傳進來的 discsReady）是透過另一個
      // useEffect 跟 isDvdSelectorOpen 同步的，天生會晚一次 render——選片
      // 當下 isDvdSelectorOpen/insertingProjectId 是同一個事件處理常式裡
      // 同時設定的，但 discsReady 要等那個同步用的 effect 跑完才會跟著變
      // false，中間會有一次 render 是「isOpen 還是舊的 true，
      // insertingProjectId 已經是新值」這種不一致的組合。這裡如果只看
      // isOpen 就進扇形展開分支，會在這個過渡瞬間把三片碟片全部重新
      // fromTo 回「從鏡頭位置飛出、scale 從 0.2 長回去」的開場動畫，畫面
      // 上看起來像選中的那片突然放大蓋到其他兩片（使用者回報的正是這個
      // 現象）。多檢查 !insertingProjectId，只要放片流程已經開始，不管
      // isOpen 傳進來是不是還沒同步到最新值，都不該再進扇形展開分支。
      if (isOpen && !insertingProjectId) {
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
        // 選片後被挑中的那一片——跟其他片一起收起來時，不是原地縮小消失
        // 也不是直線平移過去，是分三段的「拿起來、翻正放進去」動作（見
        // interaction.ts 裡三個 DVD_INSERT_*_DURATION 常數的說明）。
        //
        // 動畫延後 DVD_SELECTOR_RETRACT_DURATION 才開始——等旁邊另外兩片
        // 完全縮小消失之後，這片才開始動。原本是同時開始，這片還沒開始
        // 縮小/移動時，跟旁邊還在收縮中、尺寸都還很大的另外兩片距離太近
        // （彼此只隔 DVD_SELECTOR_ARC_SPACING=0.45，放大到 DVD_SELECTOR_
        // SCALE 倍的碟片本身就很大），畫面上看起來像選中的那片突然放大
        // 蓋到旁邊——其實是三片都還沒完全分開的錯覺，不是真的有誰變大。
        insertStartedRef.current[i] = true
        const spinGroup = spinGroupRefs.current[i]
        const timeline = gsap.timeline({
          delay: DVD_SELECTOR_RETRACT_DURATION,
          onComplete: () => {
            group.visible = false
          },
        })

        // 第1段：原地縮小，從選片放大尺寸縮回接近原始大小，這時候還是
        // 面向鏡頭、還沒開始移動——像「先把碟片捏小準備收好」。
        timeline.to(group.scale, {
          x: DVD_INSERT_SCALE_END,
          y: DVD_INSERT_SCALE_END,
          z: DVD_INSERT_SCALE_END,
          duration: DVD_INSERT_SHRINK_DURATION,
          ease: 'power2.out',
        })

        // 第2段：邊飛邊翻正。位置飛向 tray 正上方（留 DVD_INSERT_
        // HOVER_HEIGHT 的高度差，不是一次到底，留給第3段做「放下」），
        // 角度從「面向鏡頭」翻成「躺平、正面朝上」。
        //
        // quaternion 不能直接丟給 gsap tween 數值——那是對 x/y/z/w 四個
        // 分量各自線性內插，內插完不保證是單位四元數，插值路徑也不是
        // 真正的球面最短路徑，角度變化會不平順。改成 tween 一個 0~1 的
        // 代理值，每一幀用 slerpQuaternions 手動算出正確的球面內插結果。
        // 目標角度用單位四元數（identity）——DVD.tsx 的元件慣例是「本地
        // +Y 朝前」，group 本身沒有額外旋轉時 +Y 剛好對齊世界 +Y（往上），
        // 也就是「躺平、正面朝上」，等於放進打開的 tray 裡的樣子。
        const fromQuat = group.quaternion.clone()
        const toQuat = new Quaternion()
        const rotateProxy = { t: 0 }
        const hoverPosition = [
          DVD_TRAY_INSERT_POSITION[0],
          DVD_TRAY_INSERT_POSITION[1] + DVD_INSERT_HOVER_HEIGHT,
          DVD_TRAY_INSERT_POSITION[2],
        ]
        timeline.to(
          group.position,
          { x: hoverPosition[0], y: hoverPosition[1], z: hoverPosition[2], duration: DVD_INSERT_FLY_DURATION, ease: 'power2.inOut' },
        )
        timeline.to(
          rotateProxy,
          {
            t: 1,
            duration: DVD_INSERT_FLY_DURATION,
            ease: 'power2.inOut',
            onUpdate: () => group.quaternion.slerpQuaternions(fromQuat, toQuat, rotateProxy.t),
          },
          '<', // 跟上一段（飛向正上方）同時開始，翻正跟飛行是同一個動作
        )

        // spinGroup 閒置自轉留下的角度也要一起歸零，不然「躺平」只翻對了
        // 外層 discGroup，內層還帶著閒置自轉當下累積的角度，兩層疊起來
        // 還是歪的。跟 handleHoverChange 轉正時同樣要先 wrap 到最近的 0
        // 再 tween，避免累積角度太大時硬轉好幾圈。
        if (spinGroup) {
          spinGroup.rotation.x = wrapToNearestZero(spinGroup.rotation.x)
          spinGroup.rotation.y = wrapToNearestZero(spinGroup.rotation.y)
          gsap.killTweensOf(spinGroup.rotation)
          timeline.to(
            spinGroup.rotation,
            { x: 0, y: 0, z: 0, duration: DVD_INSERT_FLY_DURATION, ease: 'power2.inOut' },
            '<',
          )
        }

        // 第3段：放下。從 tray 正上方做最後一小段下降到精確的插槽位置，
        // 模擬「放下」的動作，不是整段飛行一次到位。
        timeline.to(group.position, {
          x: DVD_TRAY_INSERT_POSITION[0],
          y: DVD_TRAY_INSERT_POSITION[1],
          z: DVD_TRAY_INSERT_POSITION[2],
          duration: DVD_INSERT_DROP_DURATION,
          ease: 'power2.in',
        })
      } else {
        gsap.to(group.scale, {
          x: 0,
          y: 0,
          z: 0,
          duration: DVD_SELECTOR_RETRACT_DURATION,
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
      // 不超過半圈的最短路徑，瞬間定住的視覺效果不會經過奇怪的中間角度
      // （wrapToNearestZero 定義在檔案最上面，選片放進 player 那段動畫
      // 也要用同一個函式）。
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
