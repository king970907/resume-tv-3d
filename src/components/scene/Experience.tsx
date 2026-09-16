import { useEffect, useRef, useState } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { Vector3 } from 'three'
import type { AmbientLight, DirectionalLight, PointLight } from 'three'
import { RetroTV } from '@/components/tv/RetroTV'
import type { ScreenContent } from '@/components/tv/RetroTV'
import { DVDPlayer } from '@/components/dvd/DVDPlayer'
import { DVDCase } from '@/components/dvd/DVDCase'
import { DVDSelector } from '@/components/dvd/DVDSelector'
import { CAMERA_POSITION, CAMERA_TARGET, ORBIT_MAX_DISTANCE, ORBIT_MIN_DISTANCE } from '@/cores/const/scene'
import {
  DVD_INSERT_DROP_DURATION,
  DVD_INSERT_FLY_DURATION,
  DVD_INSERT_SETTLE_PAUSE,
  DVD_INSERT_SHRINK_DURATION,
  DVD_SELECTOR_CAMERA_DISTANCE,
  DVD_SELECTOR_CAMERA_DOLLY_DURATION,
  DVD_TRAY_ANIM_DURATION,
  SCENE_DIM_DURATION,
  SCENE_DIM_FACTOR,
} from '@/cores/const/interaction'
import {
  CAMERA_FOCUS_DURATION,
  CAMERA_FOCUS_FOV,
  CAMERA_FOCUS_POSITION,
  CAMERA_FOCUS_TARGET,
  CAMERA_ZOOM_FOV,
  CAMERA_ZOOM_POSITION,
  CAMERA_ZOOM_TARGET,
  INTRO_LOADING_DURATION,
  SCREEN_ZOOM_IN_DURATION,
  SCREEN_ZOOM_LOADING_DURATION,
  SCREEN_ZOOM_OUT_DURATION,
} from '@/cores/const/screen'
import { getResponsiveCameraPosition } from '@/cores/utils/responsiveCamera'
import type { Project } from '@/cores/types/project'
import type { ScreenPage } from '@/data/screenPages'
import type { ScreenPhase } from '@/cores/types/screenPhase'

// 場景燈光的基準亮度——選片畫面開啟時，這幾顆燈會一起乘上 SCENE_DIM_FACTOR
// 暗下去，只留選片專用的那顆燈亮著，做出「背景變黑、碟片浮現」的效果。
//
// 整體配色走「暗房裡看電視」的調子：主光源刻意調暖（像一盞立燈），背後
// 的點綴光改冷色（像窗外透進來的月光/街燈），冷暖對比讓場景在昏暗中還是
// 有層次，不會整片死灰——原本點綴光用高飽和度的螢光綠(#39ff14)，強度又
// 開到 4，等於用一顆綠色探照燈打整個場景，任何中性色材質被掃到都會泛
// 綠，這才是「泛綠光」真正的原因（不是材質本身的問題）。
//
// 第一版把整體強度壓太低，變成「看不清楚細節的暗」而不是「氣氛暗但細節
// 清楚」（使用者拿一個暗色系但物件細節都看得很清楚的參考網站對比）。配色
// 維持不變，只把每個光源的強度整體調高一截，尤其是主光源跟補光——暗色系
// 的重點是背景/陰影夠暗、對比夠強，不是把物件本身也一起悶暗。
const AMBIENT_BASE_INTENSITY = 0.45
const KEY_LIGHT_BASE_INTENSITY = 1.6
const FILL_LIGHT_BASE_INTENSITY = 0.6
const ACCENT_LIGHT_BASE_INTENSITY = 4
const SELECTOR_LIGHT_INTENSITY = 1.5

interface ExperienceProps {
  phase: ScreenPhase
  onPhaseChange: (phase: ScreenPhase) => void
  pageCount: number
  page: ScreenPage
  isChannelLoading: boolean
  onChannelChange: (index: number) => void
  // 選片放片流程整段（開 player -> 碟片飛進去 -> 關 player）跑完之後才
  // 呼叫——把「螢幕該顯示這個作品了」的消息往上回報給 MainScene，跟
  // onChannelChange 是平行的兩個「螢幕內容來源」，只是觸發時機不同
  // （一個是旋鈕，一個是整段放片動畫跑完）。
  onProjectInserted: (project: Project) => void
}

export function Experience({
  phase,
  onPhaseChange,
  pageCount,
  page,
  isChannelLoading,
  onChannelChange,
  onProjectInserted,
}: ExperienceProps) {
  const ambientRef = useRef<AmbientLight>(null)
  const keyLightRef = useRef<DirectionalLight>(null)
  const fillLightRef = useRef<DirectionalLight>(null)
  const accentLightRef = useRef<PointLight>(null)
  const selectorLightRef = useRef<PointLight>(null)

  // OrbitControls 直接掛在 canvas DOM 上監聽，跟 R3F 自己的事件系統是兩條
  // 線——選片期間、螢幕運鏡期間鏡頭都必須是「被程式控制」而不是使用者
  // 亂轉，所以要透過 makeDefault + useThree 拿到同一個實例手動鎖住，跟
  // 旋鈕拖曳時期解決的問題是同一招。額外拿 target 是因為螢幕聚焦/全螢幕
  // 運鏡不只要移動鏡頭位置，還要改鏡頭「看向哪裡」，OrbitControls 自己
  // 內部也維護一份 target，兩邊要同步。
  const controls = useThree((state) => state.controls) as unknown as {
    enabled: boolean
    target: Vector3
    update: () => void
  } | null
  const camera = useThree((state) => state.camera)
  const viewportSize = useThree((state) => state.size)

  // 開場預設遠景（CAMERA_POSITION/CAMERA_TARGET，見 scene.ts）是照桌機
  // 寬螢幕比例調的構圖，手機直式螢幕下 TV 會整台跑出畫面外——見
  // responsiveCamera.ts 的說明。只在 intro 階段套用：一旦使用者點擊
  // 開始聚焦，鏡頭就交給下面那個「螢幕流程」的 effect 接管，不會再回頭
  // 用這組遠景，不用擔心兩邊互相覆蓋。
  useEffect(() => {
    if (phase !== 'intro') return
    const aspect = viewportSize.width / viewportSize.height
    const responsivePosition = getResponsiveCameraPosition(CAMERA_POSITION, CAMERA_TARGET, aspect)
    camera.position.copy(responsivePosition)
  }, [phase, viewportSize, camera])

  const [isDvdSelectorOpen, setIsDvdSelectorOpen] = useState(false)
  // 跟 isDvdSelectorOpen 分開——盒蓋掀開/場景變暗要立刻觸發，但碟片扇形
  // 展開要等鏡頭確定拉到安全距離之後才能算位置（DVDSelector 是用「開啟
  // 當下」的鏡頭位置算扇形排列，鏡頭如果太近，碟片會直接卡進 TV 機身）。
  const [discsReady, setDiscsReady] = useState(false)

  // 選片後把碟片放進 DVD player 的流程——兩個獨立的狀態：isDvdPlayerOpen
  // 控制 tray 開闔（跟 DVDCase 的 isOpen 同一套受控元件寫法，這裡多了
  // 「不是使用者手動點才開」的用法：選片流程會直接呼叫 setIsDvdPlayerOpen
  // 把 tray 打開/關上）；insertingProjectId 告訴 DVDSelector「這一片碟片
  // 現在要飛去 player，不是跟其他片一樣原地縮小」，流程跑完就清空。
  const [isDvdPlayerOpen, setIsDvdPlayerOpen] = useState(false)
  const [insertingProjectId, setInsertingProjectId] = useState<string | null>(null)
  const insertTimersRef = useRef<gsap.core.Tween[]>([])

  useEffect(() => {
    const timers = insertTimersRef.current
    return () => {
      timers.forEach((timer) => timer.kill())
    }
  }, [])

  useEffect(() => {
    if (!isDvdSelectorOpen) {
      // 收起來不用管鏡頭有沒有拉遠過——直接讓碟片收回去就好，鏡頭位置
      // 沒有要求要還原。
      gsap.killTweensOf(camera.position)
      // oxlint-disable-next-line react/set-state-in-effect
      setDiscsReady(false)
      return
    }

    const distance = camera.position.distanceTo(new Vector3(...CAMERA_TARGET))
    if (distance >= DVD_SELECTOR_CAMERA_DISTANCE) {
      // 鏡頭已經夠遠，不用拉——直接標記碟片可以展開，不用等一個不會發生
      // 的動畫。
      // oxlint-disable-next-line react/set-state-in-effect
      setDiscsReady(true)
      return
    }

    // 沿著「目標→目前鏡頭位置」的方向往外拉，不是沿著鏡頭朝向——這樣
    // 拉遠的過程中畫面看起來像純粹後退，不會因為順便轉向而讓使用者暈。
    const direction = camera.position.clone().sub(new Vector3(...CAMERA_TARGET)).normalize()
    const targetPosition = new Vector3(...CAMERA_TARGET).addScaledVector(direction, DVD_SELECTOR_CAMERA_DISTANCE)

    gsap.killTweensOf(camera.position)
    gsap.to(camera.position, {
      x: targetPosition.x,
      y: targetPosition.y,
      z: targetPosition.z,
      duration: DVD_SELECTOR_CAMERA_DOLLY_DURATION,
      ease: 'power2.out',
      onComplete: () => setDiscsReady(true),
    })
  }, [isDvdSelectorOpen, camera])

  useEffect(() => {
    const lights = [ambientRef.current, keyLightRef.current, fillLightRef.current, accentLightRef.current]
    const bases = [
      AMBIENT_BASE_INTENSITY,
      KEY_LIGHT_BASE_INTENSITY,
      FILL_LIGHT_BASE_INTENSITY,
      ACCENT_LIGHT_BASE_INTENSITY,
    ]
    const dimTarget = isDvdSelectorOpen ? SCENE_DIM_FACTOR : 1

    lights.forEach((light, i) => {
      if (!light) return
      gsap.killTweensOf(light)
      gsap.to(light, { intensity: bases[i] * dimTarget, duration: SCENE_DIM_DURATION, ease: 'power2.out' })
    })

    if (selectorLightRef.current) {
      if (isDvdSelectorOpen) {
        // 選片燈原本釘死在世界座標的固定點——碟片扇形排列的位置是跟著
        // 「開盒當下的鏡頭」算的（見 DVDSelector.tsx），使用者開盒前如果把
        // 鏡頭轉到別的角度，固定位置的燈就可能完全對不上碟片的方向，碟片
        // 幾乎沒被照到、只剩邊緣一絲高光，實測過（把鏡頭轉到側面再開盒）
        // 確實會整片死黑，跟這次回報的「遮罩太暗」是同一個成因。
        //
        // 改成每次開盒當下，用「鏡頭位置＋鏡頭前方＋鏡頭上方」現算一個
        // 跟著鏡頭走的位置——效果像相機上加了一顆隨機身轉的補光燈，不管
        // 使用者開盒前轉到哪個角度，選片時碟片前方一定有光。跟 DVDSelector
        // 算扇形排列用的是同一套 forward/up 向量，兩邊天然對得上。
        const forward = new Vector3()
        camera.getWorldDirection(forward)
        const lightPosition = camera.position
          .clone()
          .addScaledVector(forward, 0.5)
          .addScaledVector(camera.up, 0.4)
        selectorLightRef.current.position.copy(lightPosition)
      }

      gsap.killTweensOf(selectorLightRef.current)
      gsap.to(selectorLightRef.current, {
        intensity: isDvdSelectorOpen ? SELECTOR_LIGHT_INTENSITY : 0,
        duration: SCENE_DIM_DURATION,
        ease: 'power2.out',
      })
    }

    // `controls` 是 useThree 拿到的、真實存在的 three.js OrbitControls 實例，
    // 不是 React state——直接改 .enabled 就是它預期的用法（跟 RetroTV 旋鈕
    // 那次踩過的 TS/lint 坑一樣）。選片開著、放片動畫還沒跑完、或螢幕運鏡
    // 流程不在 idle 階段時都不能讓使用者自由轉鏡頭，全部條件都要滿足才
    // 解鎖。
    // oxlint-disable-next-line react/immutability
    if (controls) controls.enabled = !isDvdSelectorOpen && !insertingProjectId && phase === 'idle'
  }, [isDvdSelectorOpen, insertingProjectId, controls, camera, phase])

  // 螢幕流程的鏡頭運鏡/計時——每個 phase 進來的當下決定要不要動鏡頭、要
  // 等多久才進下一步，統一集中在這裡，MainScene 只負責存 phase 本身跟
  // 渲染對應的 DOM 疊層。
  useEffect(() => {
    if (!controls) return
    if (!('isPerspectiveCamera' in camera) || !camera.isPerspectiveCamera) return

    const aspect = viewportSize.width / viewportSize.height

    if (phase === 'focusing') {
      gsap.killTweensOf(camera.position)
      gsap.killTweensOf(camera)
      gsap.killTweensOf(controls.target)
      const focusPosition = getResponsiveCameraPosition(CAMERA_FOCUS_POSITION, CAMERA_FOCUS_TARGET, aspect)
      const timeline = gsap.timeline({ onComplete: () => onPhaseChange('loading') })
      timeline.to(
        camera.position,
        { x: focusPosition.x, y: focusPosition.y, z: focusPosition.z, duration: CAMERA_FOCUS_DURATION, ease: 'power2.inOut' },
        0,
      )
      timeline.to(
        controls.target,
        {
          x: CAMERA_FOCUS_TARGET[0],
          y: CAMERA_FOCUS_TARGET[1],
          z: CAMERA_FOCUS_TARGET[2],
          duration: CAMERA_FOCUS_DURATION,
          ease: 'power2.inOut',
          onUpdate: () => controls.update(),
        },
        0,
      )
      timeline.to(camera, { fov: CAMERA_FOCUS_FOV, duration: CAMERA_FOCUS_DURATION, ease: 'power2.inOut', onUpdate: () => camera.updateProjectionMatrix() }, 0)
      return () => {
        timeline.kill()
      }
    }

    if (phase === 'loading') {
      const timer = gsap.delayedCall(INTRO_LOADING_DURATION, () => onPhaseChange('idle'))
      return () => {
        timer.kill()
      }
    }

    if (phase === 'zooming-in') {
      gsap.killTweensOf(camera.position)
      gsap.killTweensOf(camera)
      gsap.killTweensOf(controls.target)
      const zoomPosition = getResponsiveCameraPosition(CAMERA_ZOOM_POSITION, CAMERA_ZOOM_TARGET, aspect)
      const timeline = gsap.timeline({ onComplete: () => onPhaseChange('zoom-loading') })
      timeline.to(
        camera.position,
        { x: zoomPosition.x, y: zoomPosition.y, z: zoomPosition.z, duration: SCREEN_ZOOM_IN_DURATION, ease: 'power2.in' },
        0,
      )
      timeline.to(
        controls.target,
        {
          x: CAMERA_ZOOM_TARGET[0],
          y: CAMERA_ZOOM_TARGET[1],
          z: CAMERA_ZOOM_TARGET[2],
          duration: SCREEN_ZOOM_IN_DURATION,
          ease: 'power2.in',
          onUpdate: () => controls.update(),
        },
        0,
      )
      timeline.to(camera, { fov: CAMERA_ZOOM_FOV, duration: SCREEN_ZOOM_IN_DURATION, ease: 'power2.in', onUpdate: () => camera.updateProjectionMatrix() }, 0)
      return () => {
        timeline.kill()
      }
    }

    if (phase === 'zoom-loading') {
      // 鏡頭這階段不用動——已經貼近螢幕了，只是讓螢幕貼圖閃一下雜訊
      // （screenContent 那段邏輯會處理），過場感覺像「訊號切過去」，
      // 才切到全螢幕 DOM 疊層。
      const timer = gsap.delayedCall(SCREEN_ZOOM_LOADING_DURATION, () => onPhaseChange('fullscreen'))
      return () => {
        timer.kill()
      }
    }

    if (phase === 'zooming-out') {
      gsap.killTweensOf(camera.position)
      gsap.killTweensOf(camera)
      gsap.killTweensOf(controls.target)
      const focusPosition = getResponsiveCameraPosition(CAMERA_FOCUS_POSITION, CAMERA_FOCUS_TARGET, aspect)
      const timeline = gsap.timeline({ onComplete: () => onPhaseChange('idle') })
      timeline.to(
        camera.position,
        { x: focusPosition.x, y: focusPosition.y, z: focusPosition.z, duration: SCREEN_ZOOM_OUT_DURATION, ease: 'power2.out' },
        0,
      )
      timeline.to(
        controls.target,
        {
          x: CAMERA_FOCUS_TARGET[0],
          y: CAMERA_FOCUS_TARGET[1],
          z: CAMERA_FOCUS_TARGET[2],
          duration: SCREEN_ZOOM_OUT_DURATION,
          ease: 'power2.out',
          onUpdate: () => controls.update(),
        },
        0,
      )
      timeline.to(camera, { fov: CAMERA_FOCUS_FOV, duration: SCREEN_ZOOM_OUT_DURATION, ease: 'power2.out', onUpdate: () => camera.updateProjectionMatrix() }, 0)
      return () => {
        timeline.kill()
      }
    }

    return undefined
    // phase 是唯一該觸發這個 effect 重跑的東西——onPhaseChange 是穩定的
    // setState 函式，camera/controls 是 useThree 拿到的穩定實例，
    // viewportSize 故意不放進依賴——鏡頭姿態只在「進入這個 phase 的當下」
    // 用當時的寬高比算一次，中途真的轉螢幕方向頂多下次換 phase 才會重算，
    // 不需要為了這個邊角案例讓整段運鏡在使用者旋轉裝置時被打斷重來。
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // 點碟片之後的整段「放片」流程：
  //   1. 立刻關掉選片畫面（其他碟片退場、盒蓋跟著關）、打開 DVD player
  //      的 tray，選中的碟片同時飛向 tray（DVDSelector 自己接管，見它的
  //      insertingProjectId 那段邏輯）——三件事同時發生，不用互等。
  //   2. 等碟片飛到、tray 也開好之後，多停頓一下（DVD_INSERT_SETTLE_
  //      PAUSE，讓使用者看得出「碟片到位了」），才關 tray。
  //   3. tray 關完，才通知 MainScene 螢幕該顯示這個作品——時機對在「tray
  //      關起來」而不是「碟片一到位」，感覺才像「片子放好、機器關起來
  //      準備開始播放」，不是碟片憑空消失螢幕就跳畫面。
  const handleSelectProject = (project: Project) => {
    // 正常操作下選片畫面收起來的當下碟片就不能再點了，不會重複觸發；
    // 這個保護主要是防呆（例如同一顆碟片的點擊事件在畫面更新前重複觸發
    // 兩次），避免兩段放片流程的計時器疊在一起互搶 isDvdPlayerOpen/
    // insertingProjectId 的狀態。
    if (insertingProjectId) return
    setIsDvdSelectorOpen(false)
    setInsertingProjectId(project.id)
    setIsDvdPlayerOpen(true)

    // 碟片那邊現在是三段式動畫（縮小 -> 邊飛邊翻正 -> 放下，見 DVDSelector
    // 的說明），要等三段全部播完才算「碟片到位」，不能只算飛行那一段。
    const discInsertDuration = DVD_INSERT_SHRINK_DURATION + DVD_INSERT_FLY_DURATION + DVD_INSERT_DROP_DURATION
    const settleDelay = Math.max(discInsertDuration, DVD_TRAY_ANIM_DURATION) + DVD_INSERT_SETTLE_PAUSE
    const closeTrayTimer = gsap.delayedCall(settleDelay, () => {
      setIsDvdPlayerOpen(false)
      setInsertingProjectId(null)

      const revealTimer = gsap.delayedCall(DVD_TRAY_ANIM_DURATION, () => {
        onProjectInserted(project)
      })
      insertTimersRef.current.push(revealTimer)
    })
    insertTimersRef.current.push(closeTrayTimer)
  }

  // 螢幕現在該顯示什麼——intro/focusing 兩個階段螢幕是關的（黑），loading
  // /zoom-loading 兩個階段或旋鈕換頁中都畫雜訊（開場的「電視開機」跟點
  // 螢幕的「切全螢幕」是兩個不同時機的過場，但畫面效果一樣是雜訊，共用
  // 同一個 'loading' mode），其餘階段（idle/zooming-in/fullscreen/
  // zooming-out）顯示目前頁面內容。運鏡途中(zooming-in/out)、全螢幕疊層
  // 蓋著的時候螢幕內容其實不會被看到，但還是要維持顯示正確內容，運鏡回來
  // 時才不會閃一下錯誤畫面。page 本身（含右上角 badge）已經由 MainScene
  // 決定好是頻道內容還是選好的 DVD 內容，這裡不用區分來源。
  const screenContent: ScreenContent =
    phase === 'loading' || phase === 'zoom-loading' || isChannelLoading
      ? { mode: 'loading' }
      : phase === 'intro' || phase === 'focusing'
        ? { mode: 'off' }
        : { mode: 'page', page }

  const isScreenInteractive = phase === 'idle' && !isDvdSelectorOpen

  return (
    <>
      <color attach="background" args={['#0a0a0a']} />

      {/* 整體墊底亮度——墊高最低亮度，陰影死角才不會死黑一片。壓低強度、
          調暖色溫，讓沒被主光/補光直接照到的角落是「暗房裡的餘光」，
          不是死黑，也不是大白天的平光。 */}
      <ambientLight ref={ambientRef} intensity={AMBIENT_BASE_INTENSITY} color="#3a3226" />

      {/* 主光源——從上方偏前打下來，唯一負責投影的光。調成暖色（像一盞
          立燈/檯燈），是整個場景裡最亮、最有存在感的光源。 */}
      <directionalLight
        ref={keyLightRef}
        position={[0.6, 1.2, 0.8]}
        intensity={KEY_LIGHT_BASE_INTENSITY}
        color="#ffd9a8"
        castShadow
      />

      {/* 補光——低角度、從前方打過來，專門補到 DVD player 的正面，
          因為它疊在 TV 下層，正好被主光源的影子擋住。刻意調成很淡的冷白
          （不是純白），強度也壓低，功能上只是把主光源照不到的死角托出
          輪廓，不會搶主光源的暖色調。 */}
      <directionalLight
        ref={fillLightRef}
        position={[0, 0.35, 1.2]}
        intensity={FILL_LIGHT_BASE_INTENSITY}
        color="#cfd8e8"
      />

      {/* 背後點綴——像窗外透進來的月光/街燈，冷色調跟主光源的暖色形成對比，
          把物件從全黑背景裡「勾」出輪廓光，暗房氛圍才有層次感，不是一片
          死黑。這個版本的 three.js 點光源用的是 candela 單位，數字要開得
          比方向光/環境光大很多才看得出來。（原本這裡是高飽和度螢光綠、
          強度開到 4，等於拿一顆綠色探照燈打整個場景，才是造成「泛綠光」
          的原因——不是材質問題，見上面 ACCENT_LIGHT_BASE_INTENSITY 的說明。） */}
      <pointLight ref={accentLightRef} position={[-0.6, 0.5, -0.4]} intensity={ACCENT_LIGHT_BASE_INTENSITY} color="#5aa9e6" />

      {/* 選片專用燈——平常是 0，選片畫面開啟時才亮起來，讓其他光源暗下去
          後，飛到鏡頭前的碟片還是看得清楚。故意不在這裡寫死 position——
          交給上面的 effect 在每次開盒當下用「鏡頭位置」現算，讓這顆燈跟著
          鏡頭走（理由見那段 effect 的註解）。如果在這裡也寫一個固定
          position，React 每次重渲染都會把 effect 現算的位置蓋回這個固定
          值，等於白算。 */}
      <pointLight ref={selectorLightRef} intensity={0} color="#e8e8d0" />

      <DVDPlayer
        isOpen={isDvdPlayerOpen}
        onToggle={() => {
          // 放片流程進行中、或螢幕運鏡不在 idle 階段時，都不給使用者手動
          // 開闔 tray——理由跟下面 DVDCase 的 onToggle 一樣，避免使用者
          // 亂點打斷正在跑的動畫序列，或跟運鏡動畫互搶 camera 狀態。
          if (phase !== 'idle' || insertingProjectId) return
          setIsDvdPlayerOpen((v) => !v)
        }}
      />
      <RetroTV
        pageCount={pageCount}
        screenContent={screenContent}
        interactive={isScreenInteractive}
        onChannelChange={onChannelChange}
        onScreenClick={() => {
          if (phase === 'idle') onPhaseChange('zooming-in')
        }}
      />
      <DVDCase
        isOpen={isDvdSelectorOpen}
        onToggle={() => {
          // 螢幕流程不在 idle 階段、或放片流程正在跑的時候都不給開盒——
          // 前者避免兩套各自控制鏡頭的動畫互搶 camera.position/
          // controls.target，後者避免使用者在碟片飛向 player 的途中又
          // 手動開盒，讓選片畫面的開/收邏輯跟放片流程的收尾互相打架。
          if (phase !== 'idle' || insertingProjectId) return
          setIsDvdSelectorOpen((v) => !v)
        }}
      />
      <DVDSelector
        isOpen={discsReady}
        insertingProjectId={insertingProjectId}
        onSelect={handleSelectProject}
        onClose={() => setIsDvdSelectorOpen(false)}
      />

      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      <OrbitControls
        makeDefault
        enablePan={false}
        target={CAMERA_TARGET}
        minDistance={ORBIT_MIN_DISTANCE}
        maxDistance={ORBIT_MAX_DISTANCE}
        maxPolarAngle={Math.PI / 2.1}
      />
    </>
  )
}
