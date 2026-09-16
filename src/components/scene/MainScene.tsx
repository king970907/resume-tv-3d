import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useRef, useState } from 'react'
import { Experience } from './Experience'
import { IntroOverlay } from '@/components/ui/IntroOverlay'
import { FullscreenOverlay } from '@/components/ui/FullscreenOverlay'
import { CAMERA_FOV, CAMERA_POSITION } from '@/cores/const/scene'
import { CHANNEL_SWITCH_LOADING_DURATION } from '@/cores/const/screen'
import { SCREEN_PAGES, projectToScreenPage } from '@/data/screenPages'
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
  const [pageIndex, setPageIndex] = useState(0)
  // 選片放片流程跑完之後顯示的作品——跟 pageIndex（旋鈕轉台用）是平行
  // 的兩個「螢幕內容來源」，同一時間只有一個生效：非 null 就顯示這個
  // 作品，旋鈕轉台會把它清空、換回頻道內容（轉旋鈕=不看 DVD 了，跟真的
  // 電視/DVD 複合機的直覺一致）。
  const [insertedProject, setInsertedProject] = useState<Project | null>(null)

  // 旋鈕換頁/選片放片共用的短暫 loading——跟大的 phase 狀態機分開存，
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

  const handleChannelChange = (index: number) => {
    setPageIndex(index)
    setInsertedProject(null)
    flashChannelLoading()
  }

  // Experience.tsx 的放片流程（開 player -> 碟片飛進去 -> 關 player）跑完
  // 才會呼叫這裡——螢幕內容切換的時機對在「tray 關起來」，不是碟片一
  // 到位就切，理由見 Experience.tsx 裡 handleSelectProject 的註解。
  const handleProjectInserted = (project: Project) => {
    setInsertedProject(project)
    flashChannelLoading()
  }

  const currentPage = insertedProject
    ? projectToScreenPage(insertedProject, PROJECTS.findIndex((p) => p.id === insertedProject.id))
    : SCREEN_PAGES[pageIndex]

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
            pageCount={SCREEN_PAGES.length}
            page={currentPage}
            isChannelLoading={isChannelLoading}
            onChannelChange={handleChannelChange}
            onProjectInserted={handleProjectInserted}
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
          page={currentPage}
          fadingOut={phase === 'zooming-out'}
          onClose={() => setPhase('zooming-out')}
        />
      )}
    </div>
  )
}
