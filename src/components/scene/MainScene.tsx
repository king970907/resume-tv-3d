import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useRef, useState } from 'react'
import { Experience } from './Experience'
import { IntroOverlay } from '@/components/ui/IntroOverlay'
import { FullscreenOverlay } from '@/components/ui/FullscreenOverlay'
import { PlayHintOverlay } from '@/components/ui/PlayHintOverlay'
import { CAMERA_FOV, CAMERA_POSITION } from '@/cores/const/scene'
import { CHANNEL_SWITCH_LOADING_DURATION } from '@/cores/const/screen'
import { RESUME_PAGES, projectToScreenPage } from '@/data/screenPages'
import { PROJECTS } from '@/data/projects'
import type { Project } from '@/cores/types/project'
import type { ScreenPhase } from '@/cores/types/screenPhase'
import styles from './MainScene.module.css'

// Canvas 有自己獨立的 render loop，跟 React 的 render 週期不同步——
// 裡面（Experience）裝的是 Three.js 的場景圖，不是 DOM。
//
// 「開場 → 聚焦 → loading → 看畫面 → 全螢幕」這條流程的狀態（見
// cores/types/screenPhase.ts）放在這一層而不是 Experience 內部，因為
// IntroOverlay/FullscreenOverlay 是真正的 DOM，要跟 <Canvas> 平行渲染，
// 不能塞進 3D 場景裡；實際的鏡頭運鏡/計時邏輯則交給 Experience 透過
// onPhaseChange 回報狀態該往下一步走了。
export function MainScene() {
  const [phase, setPhase] = useState<ScreenPhase>('intro')
  // 履歷（頻道旋鈕轉台）目前瀏覽到第幾頁。
  const [resumePageIndex, setResumePageIndex] = useState(0)
  // 作品集（音量旋鈕轉台，只有播放中才能轉）目前瀏覽到第幾個 Project——
  // 每次按下播放鍵開始播放時，會被重設成「當初插入的那片光碟」對應的
  // index（見 handlePlayPauseToggle），之後音量旋鈕可以再自由切換。
  const [projectPageIndex, setProjectPageIndex] = useState(0)
  // player 裡目前放的是哪個作品——代表「有沒有片、片是哪一個」，不代表
  // 螢幕正在顯示的內容（放片完成後螢幕仍顯示履歷，要按播放鍵才會切換，
  // 見 isPlaying）。
  const [insertedProject, setInsertedProject] = useState<Project | null>(null)
  // 是不是正在播放作品集內容——true 時螢幕顯示 Project、音量旋鈕解鎖、
  // 頻道旋鈕鎖定；false 時螢幕顯示履歷、頻道旋鈕解鎖、音量旋鈕鎖定。
  const [isPlaying, setIsPlaying] = useState(false)

  // 旋鈕換頁/播放切換共用的短暫 loading——跟大的 phase 狀態機分開存，
  // 因為它只會在 phase==='idle' 時發生，不影響鏡頭，只是讓螢幕貼圖短暫
  // 轉成雜訊再顯示新內容，用獨立的 boolean 比塞進 ScreenPhase 的列舉
  // 簡單很多。
  const [isChannelLoading, setIsChannelLoading] = useState(false)
  const channelLoadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (channelLoadingTimeoutRef.current) clearTimeout(channelLoadingTimeoutRef.current)
    }
  }, [])

  const flashChannelLoading = () => {
    setIsChannelLoading(true)
    if (channelLoadingTimeoutRef.current) clearTimeout(channelLoadingTimeoutRef.current)
    channelLoadingTimeoutRef.current = setTimeout(() => {
      setIsChannelLoading(false)
    }, CHANNEL_SWITCH_LOADING_DURATION * 1000)
  }

  const handleResumeChannelChange = (index: number) => {
    setResumePageIndex(index)
    flashChannelLoading()
  }

  const handleProjectChannelChange = (index: number) => {
    setProjectPageIndex(index)
    flashChannelLoading()
  }

  // Experience.tsx 的放片流程（開 player -> 碟片飛進去 -> 關 player）跑完
  // 才會呼叫這裡——只記下「player 裡現在放的是哪個作品」，螢幕內容不變
  // （還是履歷，不用 flashChannelLoading，因為畫面根本沒換）。保險把
  // isPlaying 重設回 false：涵蓋「播放中重新開 case 選別片」這種中途
  // 換片的情況，讓畫面確實退回履歷、等使用者重新按播放，不會卡在舊作品
  // 的播放狀態。
  const handleDiscLoaded = (project: Project) => {
    setInsertedProject(project)
    setIsPlaying(false)
  }

  // player 左側播放鍵——播放/暫停切換。沒放片時整個沒作用（Experience.tsx
  // 那邊的門檻只擋運鏡中/放片流程進行中，「有沒有片」由這裡判斷）。開始
  // 播放的當下把 projectPageIndex 重設成「當初插入的那片光碟」對應的
  // index——選片時點的是哪一片，只決定這個起始頁，之後音量旋鈕仍可自由
  // 切換全部 Project（使用者確認的行為）。
  const handlePlayPauseToggle = () => {
    if (!insertedProject) return
    const next = !isPlaying
    setIsPlaying(next)
    if (next) {
      setProjectPageIndex(PROJECTS.findIndex((p) => p.id === insertedProject.id))
    }
    flashChannelLoading()
  }

  const currentPage = isPlaying
    ? projectToScreenPage(PROJECTS[projectPageIndex], projectPageIndex)
    : RESUME_PAGES[resumePageIndex]

  return (
    <div className={styles.scene}>
      <Canvas
        shadows
        camera={{ position: CAMERA_POSITION, fov: CAMERA_FOV }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <Experience
            phase={phase}
            onPhaseChange={setPhase}
            resumePageCount={RESUME_PAGES.length}
            projectPageCount={PROJECTS.length}
            page={currentPage}
            isChannelLoading={isChannelLoading}
            isPlaying={isPlaying}
            loadedProjectId={insertedProject?.id ?? null}
            onResumeChannelChange={handleResumeChannelChange}
            onProjectChannelChange={handleProjectChannelChange}
            onPlayPauseToggle={handlePlayPauseToggle}
            onDiscLoaded={handleDiscLoaded}
          />
        </Suspense>
      </Canvas>

      {(phase === 'intro' || phase === 'focusing') && (
        <IntroOverlay
          fadingOut={phase === 'focusing'}
          onContinue={() => setPhase('focusing')}
        />
      )}

      {(phase === 'fullscreen' || phase === 'zooming-out') && (
        <FullscreenOverlay
          fadingOut={phase === 'zooming-out'}
          onClose={() => setPhase('zooming-out')}
          resumePageIndex={isPlaying ? null : resumePageIndex}
          onResumeChannelChange={handleResumeChannelChange}
          projectPageIndex={isPlaying ? projectPageIndex : null}
          onProjectChannelChange={handleProjectChannelChange}
        />
      )}

      {/* 放片後的播放鍵提示——只在 idle（一般瀏覽構圖、player 按鈕看得到）
          且已經放片時顯示，不判斷開盒/盒子特寫（那個階段 insertedProject
          必定還是 null，見 DVDCase.tsx 的 hasDisc 鎖）。文字內容依
          isPlaying 切換，見 PlayHintOverlay.tsx。 */}
      <PlayHintOverlay
        visible={phase === 'idle' && insertedProject !== null}
        isPlaying={isPlaying}
      />
    </div>
  )
}
