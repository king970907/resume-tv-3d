import { useEffect, useRef, useState } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { Vector3 } from 'three'
import type { AmbientLight, DirectionalLight, Object3D, PointLight } from 'three'
import { RetroTV } from '@/components/tv/RetroTV'
import type { ScreenContent } from '@/components/tv/RetroTV'
import { DVDPlayer } from '@/components/dvd/DVDPlayer'
import { DVDCase } from '@/components/dvd/DVDCase'
import { DVDSelector } from '@/components/dvd/DVDSelector'
import {
  CAMERA_CASE_FOV,
  CAMERA_CASE_POSITION,
  CAMERA_CASE_TARGET,
  CAMERA_POSITION,
  CAMERA_TARGET,
  ORBIT_MAX_DISTANCE,
  ORBIT_MIN_DISTANCE,
} from '@/cores/const/scene'
import {
  DVD_CASE_VIEW_DURATION,
  DVD_INSERT_DESCEND_DURATION,
  DVD_INSERT_DROP_DURATION,
  DVD_INSERT_FLY_DURATION,
  DVD_INSERT_SETTLE_PAUSE,
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
import { PROJECTS } from '@/data/projects'
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
  resumePageCount: number
  projectPageCount: number
  page: ScreenPage
  isChannelLoading: boolean
  // 播放中（player 按了播放鍵）——鎖頻道旋鈕、解鎖音量旋鈕，往下傳給
  // RetroTV；player 那邊的按鈕燈號也要看這個決定顏色。
  isPlaying: boolean
  // player 裡目前放的是哪個作品的光碟，沒放片是 null——不只決定按鈕燈號
  // 亮不亮，也要原封不動往下傳給 DVDSelector：那邊要靠這個判斷「這片碟片
  // 已經放好了，維持原樣（attach 在 tray 上、visible）」，不要被選片畫面
  // 開合的邏輯誤判成沒人要而縮小隱藏（見 handleSelectProject 上面的說明、
  // DVDSelector.tsx 裡用到這個 prop 的地方）。
  loadedProjectId: string | null
  onResumeChannelChange: (index: number) => void
  onProjectChannelChange: (index: number) => void
  onPlayPauseToggle: () => void
  // 選片放片流程整段（開 player -> 碟片飛進去 -> 關 player）跑完之後才
  // 呼叫——把「player 裡放的是這個作品了」的消息往上回報給 MainScene。
  // 改名自 onProjectInserted：現在放片完成不等於開始播放，螢幕還是顯示
  // 履歷，要等使用者另外按播放鍵，用舊名字容易誤導成「放完就會顯示」。
  onDiscLoaded: (project: Project) => void
}

export function Experience({
  phase,
  onPhaseChange,
  resumePageCount,
  projectPageCount,
  page,
  isChannelLoading,
  isPlaying,
  loadedProjectId,
  onResumeChannelChange,
  onProjectChannelChange,
  onPlayPauseToggle,
  onDiscLoaded,
}: ExperienceProps) {
  // DVDPlayer 的按鈕燈號只需要「有沒有放片」這個布林值，不需要知道是哪個
  // 作品——在這裡算一次，兩邊都用同一份 loadedProjectId 當唯一真相來源。
  const hasDisc = loadedProjectId !== null

  const ambientRef = useRef<AmbientLight>(null)
  const keyLightRef = useRef<DirectionalLight>(null)
  const fillLightRef = useRef<DirectionalLight>(null)
  const accentLightRef = useRef<PointLight>(null)
  const selectorLightRef = useRef<PointLight>(null)
  // DVDPlayer 掛載後回報自己的 tray Object3D——DVDSelector 放片動畫最後
  // 一段要把碟片 attach 到這個物件底下，讓碟片能跟著 tray 關閉的動畫一起
  // 移動（見 DVDSelector.tsx 裡用到這個 ref 的地方的說明）。用 ref 存、
  // 不用 state，因為這個值只有 DVDSelector 的 gsap timeline 在碟片飛到位
  // 那一刻才需要讀一次，不需要因為它變動觸發任何 re-render。
  const trayObjectRef = useRef<Object3D | null>(null)

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

  // 選片後把光碟放進 DVD player 的流程——兩個獨立的狀態：isDvdPlayerOpen
  // 控制 tray 開闔（跟 DVDCase 的 isOpen 同一套受控元件寫法，這裡多了
  // 「不是使用者手動點才開」的用法：選片流程會直接呼叫 setIsDvdPlayerOpen
  // 把 tray 打開/關上）；isInserting 告訴 DVDSelector「這片光碟現在要飛去
  // player」，流程跑完就清空。場景現在只留一片光碟（不再是陣列式的
  // insertingProjectId 比對哪一個 id），布林值就夠用。
  const [isDvdPlayerOpen, setIsDvdPlayerOpen] = useState(false)
  const [isInserting, setIsInserting] = useState(false)
  const insertTimersRef = useRef<gsap.core.Tween[]>([])

  useEffect(() => {
    const timers = insertTimersRef.current
    return () => {
      timers.forEach((timer) => timer.kill())
    }
  }, [])

  // 開盒後鏡頭運鏡到盒子特寫姿態（由上往下看光碟，見 scene.ts 的
  // CAMERA_CASE_POSITION/TARGET/FOV），關閉時退回螢幕聚焦姿態——開盒
  // 只可能發生在 phase==='idle'（見下面 DVDCase 的 onToggle 門檻），這個
  // phase 底下鏡頭本來就是停在 CAMERA_FOCUS_* 那組姿態，不用退回最外層
  // 的 CAMERA_POSITION。跟下面「螢幕流程運鏡」那個 effect 是同一種手法
  // （同時補間 position/target/fov），只是這裡换成用 isDvdSelectorOpen
  // 這個獨立的布林狀態觸發，不是 phase 狀態機的一部分——開盒/關盒語意上
  // 跟「看電視螢幕」是平行的兩件事，不應該塞進同一個狀態機。
  useEffect(() => {
    if (!controls) return
    if (!('isPerspectiveCamera' in camera) || !camera.isPerspectiveCamera) return
    // 這個 effect 依賴 isDvdSelectorOpen，第一次 render（mount）時也會跑
    // 一次——如果沒有這個門檻，開場 intro/focusing 階段（isDvdSelectorOpen
    // 這時候還是預設值 false）也會被這裡的邏輯搶著把鏡頭補間到
    // CAMERA_FOCUS_POSITION，蓋掉 intro 階段自己該有的遠景，畫面上看起來
    // 像「一開場鏡頭就已經是聚焦姿態」，使用者點擊繼續後螢幕流程自己的
    // 運鏡 effect 又補一次幾乎沒有位移的動畫，感覺像「多播一次」——這正是
    // 使用者回報的現象。開盒只可能發生在 phase==='idle'（見下面 DVDCase
    // 的 onToggle 門檻），這裡也只在 idle 階段才處理，intro/focusing/
    // loading/zooming-* 這些階段自己的運鏡 effect 不會被打斷。
    if (phase !== 'idle') return

    gsap.killTweensOf(camera.position)
    gsap.killTweensOf(camera)
    gsap.killTweensOf(controls.target)

    const targetPosition = isDvdSelectorOpen ? CAMERA_CASE_POSITION : CAMERA_FOCUS_POSITION
    const targetLookAt = isDvdSelectorOpen ? CAMERA_CASE_TARGET : CAMERA_FOCUS_TARGET
    const targetFov = isDvdSelectorOpen ? CAMERA_CASE_FOV : CAMERA_FOCUS_FOV

    const timeline = gsap.timeline()
    timeline.to(
      camera.position,
      { x: targetPosition[0], y: targetPosition[1], z: targetPosition[2], duration: DVD_CASE_VIEW_DURATION, ease: 'power2.inOut' },
      0,
    )
    timeline.to(
      controls.target,
      {
        x: targetLookAt[0],
        y: targetLookAt[1],
        z: targetLookAt[2],
        duration: DVD_CASE_VIEW_DURATION,
        ease: 'power2.inOut',
        onUpdate: () => controls.update(),
      },
      0,
    )
    timeline.to(
      camera,
      { fov: targetFov, duration: DVD_CASE_VIEW_DURATION, ease: 'power2.inOut', onUpdate: () => camera.updateProjectionMatrix() },
      0,
    )
    return () => {
      timeline.kill()
    }
  }, [isDvdSelectorOpen, phase, camera, controls])

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
      // 選片燈的位置現在是固定的（見 JSX 裡的 position）——盒子特寫的鏡頭
      // 姿態本身就是固定常數（CAMERA_CASE_POSITION/TARGET），不再是「使用者
      // 開盒前鏡頭剛好轉到哪」這種會變動的東西，這裡不用再每次開盒都現算
      // 一次跟著鏡頭走的位置（舊版「碟片飛到鏡頭前」的設計才需要這樣做）。
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
    if (controls) controls.enabled = !isDvdSelectorOpen && !isInserting && phase === 'idle'
  }, [isDvdSelectorOpen, isInserting, controls, phase])

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

  // 點光碟之後的整段「放片」流程：
  //   1. 立刻關掉盒子特寫視角（鏡頭退回螢幕正面、盒蓋跟著關）、打開 DVD
  //      player 的 tray，光碟同時飛向 tray（DVDSelector 自己接管）——
  //      三件事同時發生，不用互等。
  //   2. 等光碟飛到、tray 也開好之後，多停頓一下（DVD_INSERT_SETTLE_
  //      PAUSE，讓使用者看得出「光碟到位了」），才關 tray。
  //   3. 關 tray 的同時就呼叫 onDiscLoaded 通知 MainScene「player 裡放的
  //      是這個作品了」——螢幕仍顯示履歷，不會自動切換內容，要等使用者
  //      另外按播放鍵。這裡故意跟 setIsInserting(false) 同一個 tick 呼叫，
  //      是因為 DVDSelector 那邊要靠 hasDisc 這個 prop 判斷「已經放好了」
  //      ——如果 onDiscLoaded 延後於 isInserting 清空，會有一段時間兩個
  //      條件都不成立，讓光碟被誤判成「沒人要」而縮小隱藏，事後手動點開
  //      tray 會看到裡面是空的（上一輪重構前實測到的真正 bug，不是單純
  //      的時機美觀問題，這次沿用同一個修法）。
  const handleSelectProject = () => {
    // 正常操作下盒子特寫視角收起來的當下光碟就不能再點了，不會重複觸發；
    // 這個保護主要是防呆（例如點擊事件在畫面更新前重複觸發兩次），避免
    // 兩段放片流程的計時器疊在一起互搶 isDvdPlayerOpen/isInserting 的
    // 狀態。
    if (isInserting) return
    setIsDvdSelectorOpen(false)
    setIsInserting(true)
    setIsDvdPlayerOpen(true)

    // 光碟那邊現在是「邊飛邊翻正、越過 TV 上方 -> 垂直降下 -> 放下」三段
    // （見 DVDSelector 的說明），要等全部播完才算「光碟到位」，不能只算
    // 飛行那一段，不然 tray 會在動畫還沒播完就關起來。
    const discInsertDuration = DVD_INSERT_FLY_DURATION + DVD_INSERT_DESCEND_DURATION + DVD_INSERT_DROP_DURATION
    const settleDelay = Math.max(discInsertDuration, DVD_TRAY_ANIM_DURATION) + DVD_INSERT_SETTLE_PAUSE
    const closeTrayTimer = gsap.delayedCall(settleDelay, () => {
      setIsDvdPlayerOpen(false)
      setIsInserting(false)
      onDiscLoaded(PROJECTS[0])
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

      {/* 選片專用燈——平常是 0，開盒特寫時才亮起來，讓其他光源暗下去後，
          躺在盒子裡的光碟還是看得清楚。位置是固定的（在盒子特寫鏡頭的
          位置跟目標點之間、稍微偏上方一點，等於幫這顆固定鏡頭姿態擺一顆
          固定的補光），不用像舊版「碟片飛到鏡頭前」那樣每次開盒都現算
          跟著鏡頭走的位置——現在鏡頭姿態本身就是固定常數，光碟位置也是
          固定常數，兩邊天生對得上。 */}
      <pointLight ref={selectorLightRef} position={[0.05, 1.0, 0.15]} intensity={0} color="#e8e8d0" />

      <DVDPlayer
        isOpen={isDvdPlayerOpen}
        onToggle={() => {
          // 放片流程進行中、或螢幕運鏡不在 idle 階段時，都不給使用者手動
          // 開闔 tray——理由跟下面 DVDCase 的 onToggle 一樣，避免使用者
          // 亂點打斷正在跑的動畫序列，或跟運鏡動畫互搶 camera 狀態。
          if (phase !== 'idle' || isInserting) return
          setIsDvdPlayerOpen((v) => !v)
        }}
        onTrayReady={(tray) => { trayObjectRef.current = tray }}
        hasDisc={hasDisc}
        isPlaying={isPlaying}
        onPlayPauseToggle={() => {
          // 跟上面 tray 的 onToggle 用同一組門檻——運鏡中或放片流程進行中
          // 都不給按，避免播放狀態跟正在跑的動畫序列互相打架。有沒有片
          // 可以按（hasDisc）交給 MainScene 的 handlePlayPauseToggle 判斷，
          // 這裡不重複檢查。
          if (phase !== 'idle' || isInserting) return
          onPlayPauseToggle()
        }}
      />
      <RetroTV
        resumePageCount={resumePageCount}
        projectPageCount={projectPageCount}
        screenContent={screenContent}
        interactive={isScreenInteractive}
        isPlaying={isPlaying}
        onResumeChannelChange={onResumeChannelChange}
        onProjectChannelChange={onProjectChannelChange}
        onScreenClick={() => {
          if (phase === 'idle') onPhaseChange('zooming-in')
        }}
      />
      <DVDCase
        isOpen={isDvdSelectorOpen}
        onToggle={() => {
          // 螢幕流程不在 idle 階段、放片流程正在跑、或已經放過片時都不給
          // 開盒——前兩個理由跟原本一樣（避免鏡頭/狀態互搶），最後一個是
          // 新的：場景只留一片光碟、沒有退片機制，放進去之後盒子再打開
          // 也是空的，直接不給開。
          if (phase !== 'idle' || isInserting || hasDisc) return
          setIsDvdSelectorOpen((v) => !v)
        }}
      />
      <DVDSelector
        isOpen={isDvdSelectorOpen}
        isInserting={isInserting}
        hasDisc={hasDisc}
        trayRef={trayObjectRef}
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
