import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import gsap from 'gsap'
import { Quaternion, Vector3 } from 'three'
import type { Group, Object3D } from 'three'
import { PROJECTS } from '@/data/projects'
import {
  CAMERA_CASE_POSITION,
  CAMERA_CASE_TARGET,
  DVD_CASE_DISC_REST_POSITION,
  DVD_CASE_DISC_REST_ROTATION,
  DVD_INSERT_CLEAR_POSITION,
  DVD_TRAY_INSERT_POSITION,
} from '@/cores/const/scene'
import {
  DVD_INSERT_DESCEND_DURATION,
  DVD_INSERT_DROP_DURATION,
  DVD_INSERT_FLY_DURATION,
  DVD_INSERT_HOVER_HEIGHT,
} from '@/cores/const/interaction'
import { DVD } from './DVD'

// 場景現在只留一片光碟（使用者確認的方向：3 片同時存在是換片 bug 的根源，
// 見這次重構前的討論），固定用 PROJECTS[0]——跟 DVDCase.tsx 原本那片
// 純裝飾用碟的身份一樣，只是現在真的可以點、可以飛進 player。
const DISC_PROJECT = PROJECTS[0]

// 背板蓋在光碟後面，接住「點擊光碟以外的地方」的事件，用來關閉盒子特寫
// 視角——位置沿著鏡頭到目標點的方向，放在光碟後方一段距離，這樣光碟本身
// 擋在前面優先被打中，點不到光碟的地方射線才會落到這片背板上。跟舊版
// （3 片碟時代）不同的是，這次鏡頭姿態是固定常數（CAMERA_CASE_POSITION/
// TARGET，不是使用者當下鏡頭），背板的世界座標因此也是固定的，只要算
// 一次，不需要每次開盒都重算。
const BACKDROP_DISTANCE_PAST_DISC = 0.6
const BACKDROP_SIZE = 3

interface DVDSelectorProps {
  // 盒子特寫視角是不是開著——由 Experience.tsx 統一管理（跟 DVDCase 共用
  // 同一個布林值）。
  isOpen: boolean
  // 這片光碟是不是正在飛進 player 的動畫過程中。
  isInserting: boolean
  // player 裡已經放好光碟了——場景只有一片光碟，放進去之後就不會再變回
  // 可選狀態（case 也不會再讓你開，見 Experience.tsx），這裡當雙重保險，
  // 避免任何邊角情況下還讓已經放進去的光碟又被點擊觸發一次。
  hasDisc: boolean
  // DVDPlayer 掛載後回報的 tray Object3D（見 DVDPlayer.tsx 的 onTrayReady）
  // ——光碟放到 tray 上之後要 attach 到這個物件底下，讓它之後能跟著 tray
  // 關閉的動畫一起移動，不用自己另外算一次位置。
  trayRef: RefObject<Object3D | null>
  onSelect: () => void
  // 點擊光碟以外的地方（背板）要能取消，關閉盒子特寫視角，不選這片光碟。
  onClose: () => void
}

export function DVDSelector({ isOpen, isInserting, hasDisc, trayRef, onSelect, onClose }: DVDSelectorProps) {
  const discGroupRef = useRef<Group>(null)
  // 這片光碟的放片 timeline 是不是已經開始了——isInserting 這個 prop
  // 在整段放片流程中只會從 false 變 true 一次、再變回 false 一次，不像
  // 舊版（多片碟時代）有 isOpen/insertingProjectId 兩個各自獨立、可能
  // 暫時不同步的 state 需要互相防呆，這裡單純防止同一次 isInserting=true
  // 期間如果因為其他原因觸發額外 re-render，不要重新建一次 timeline。
  const insertStartedRef = useRef(false)

  useEffect(() => {
    if (!isInserting) {
      insertStartedRef.current = false
      return
    }
    if (insertStartedRef.current) return
    insertStartedRef.current = true

    const group = discGroupRef.current
    if (!group) return

    gsap.killTweensOf(group.position)
    gsap.killTweensOf(group.scale)

    // 邊飛邊翻正、垂直降下、放下——三段式（不用像舊版先縮小：光碟本來就
    // 是盒子裡的原始尺寸，選片畫面沒有把它放大過，不需要縮小這一段，見
    // interaction.ts 裡 DVD_INSERT_FLY_DURATION 的說明）。
    //
    // 第1段的目標故意是 DVD_INSERT_CLEAR_POSITION（tray 正上方、但維持在
    // TV 頂面以上的高度），不是直接飛向 tray 正上方——光碟起點在盒子裡
    // （TV 頂上），終點在 tray（TV 前方貼地處），這兩點如果直接連一條線，
    // 中間會直接穿過 TV 機身（使用者實測回報「移動過程中會穿過 TV」）。
    // 先飛到這個「維持高度、水平對齊」的中繼點，再讓第2段整段垂直降下，
    // 路徑就是「拿起來、越過電視上方、放下」，不會有任何一段跟機身重疊
    // （見 scene.ts 裡 DVD_INSERT_CLEAR_POSITION 的說明）。
    //
    // quaternion 不能直接丟給 gsap tween 數值——那是對 x/y/z/w 四個分量
    // 各自線性內插，內插完不保證是單位四元數，插值路徑也不是真正的球面
    // 最短路徑，角度變化會不平順。改成 tween 一個 0~1 的代理值，每一幀
    // 用 slerpQuaternions 手動算出正確的球面內插結果。目標角度用單位
    // 四元數（identity）——DVD.tsx 的元件慣例是「本地 +Y 朝前」，group
    // 本身沒有額外旋轉時 +Y 剛好對齊世界 +Y（往上），也就是「躺平、正面
    // 朝上」，等於放進打開的 tray 裡的樣子。翻正跟「越過 TV 上方」這段
    // 飛行同時發生，不需要額外的時間。
    const fromQuat = group.quaternion.clone()
    const toQuat = new Quaternion()
    const rotateProxy = { t: 0 }
    const hoverPosition = [
      DVD_TRAY_INSERT_POSITION[0],
      DVD_TRAY_INSERT_POSITION[1] + DVD_INSERT_HOVER_HEIGHT,
      DVD_TRAY_INSERT_POSITION[2],
    ]

    const timeline = gsap.timeline()
    // 第1段：飛到 tray 正上方、TV 頂面以上的高度，同時翻正。
    timeline.to(
      group.position,
      {
        x: DVD_INSERT_CLEAR_POSITION[0],
        y: DVD_INSERT_CLEAR_POSITION[1],
        z: DVD_INSERT_CLEAR_POSITION[2],
        duration: DVD_INSERT_FLY_DURATION,
        ease: 'power2.inOut',
      },
    )
    timeline.to(
      rotateProxy,
      {
        t: 1,
        duration: DVD_INSERT_FLY_DURATION,
        ease: 'power2.inOut',
        onUpdate: () => group.quaternion.slerpQuaternions(fromQuat, toQuat, rotateProxy.t),
      },
      '<', // 跟上一段（飛越 TV 上方）同時開始，翻正跟飛行是同一個動作
    )

    // 第2段：從 TV 上方純垂直降到 tray 正上方（x/z 這段不變，只降 y）。
    timeline.to(group.position, {
      x: hoverPosition[0],
      y: hoverPosition[1],
      z: hoverPosition[2],
      duration: DVD_INSERT_DESCEND_DURATION,
      ease: 'power2.in',
    })

    // 第3段：放下。從 tray 正上方做最後一小段下降到精確的插槽位置，模擬
    // 「放下」而不是整段飛行一次到位。
    timeline.to(group.position, {
      x: DVD_TRAY_INSERT_POSITION[0],
      y: DVD_TRAY_INSERT_POSITION[1],
      z: DVD_TRAY_INSERT_POSITION[2],
      duration: DVD_INSERT_DROP_DURATION,
      ease: 'power2.in',
    })

    // 光碟落到插槽之後不會消失——attach 進 tray 底下（three.js
    // Object3D.attach 會保留目前的世界座標，重新算一次相對 tray 的 local
    // position，畫面上不會跳一下），之後 tray 自己關閉時的 position tween
    // 會連帶把這個 group 也帶著移動，光碟因此會「跟著 player 一起關閉」。
    // 場景只有一片光碟、沒有退片機制，attach 完之後這片光碟就會永遠留在
    // tray 上，不需要再處理「被取代」之類的分支。
    timeline.call(() => {
      const tray = trayRef.current
      if (tray) tray.attach(group)
    })

    return () => {
      timeline.kill()
    }
  }, [isInserting, trayRef])

  // 背板的世界座標/朝向——鏡頭姿態是固定常數（CAMERA_CASE_POSITION/
  // TARGET），只要算一次，不用像舊版那樣每次開盒都重新讀「當下鏡頭」。
  const backdropTransform = useMemo(() => {
    const camPos = new Vector3(...CAMERA_CASE_POSITION)
    const target = new Vector3(...CAMERA_CASE_TARGET)
    const forward = target.clone().sub(camPos).normalize()
    const position = camPos.clone().add(forward.clone().multiplyScalar(camPos.distanceTo(target) + BACKDROP_DISTANCE_PAST_DISC))
    // PlaneGeometry 預設法向量是本地 +Z，轉成朝向鏡頭（跟 forward 相反）。
    const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), forward.clone().negate())
    return { position, quaternion }
  }, [])

  // DVD.tsx 內部的 handleClick 自己會呼叫 event.stopPropagation()，這裡
  // 不用再喊一次——只需要在真的要不要觸發 onSelect 之間把關（盒子特寫
  // 視角沒開、已經放過片、或正在放片中都不該再觸發一次選片）。
  const handleDiscSelect = () => {
    if (!isOpen || hasDisc || isInserting) return
    onSelect()
  }

  const handleBackdropClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onClose()
  }

  return (
    <>
      {/* 只有盒子特寫視角開啟時才掛載——react-three-fiber 的事件系統是在
          物件掛載、handler 註冊的當下就把它記進可被 raycast 命中的清單，
          之後不會因為 visible 變 false 就跳過（舊版 DVDSelector 踩過的坑，
          見 git 歷史），改成整個元件只在 isOpen 時才掛載，關閉時直接從
          場景圖移除，才是真的「不會被點到」。 */}
      {isOpen && (
        <mesh position={backdropTransform.position} quaternion={backdropTransform.quaternion} onClick={handleBackdropClick}>
          <planeGeometry args={[BACKDROP_SIZE, BACKDROP_SIZE]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
      )}

      {/* 這片光碟永遠掛載、永遠可見——靜置在盒子裡的姿態就是它的初始
          position/rotation（跟舊版裝飾碟原本在 DVDCase.tsx 裡的位置對齊，
          見 scene.ts 兩個 DVD_CASE_DISC_REST_* 常數的說明），選中之後
          用 ref 直接改 position/quaternion 飛進 player，不需要另外處理
          「沒被選中時要不要隱藏」——場景只有這一片，沒有其他碟需要比較。 */}
      <group ref={discGroupRef} position={DVD_CASE_DISC_REST_POSITION} rotation={DVD_CASE_DISC_REST_ROTATION}>
        <DVD project={DISC_PROJECT} onSelect={handleDiscSelect} />
      </group>
    </>
  )
}
