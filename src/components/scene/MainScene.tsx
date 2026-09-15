import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useRef, useState } from 'react'
import { Experience } from './Experience'
import { IntroOverlay } from '@/components/ui/IntroOverlay'
import { FullscreenOverlay } from '@/components/ui/FullscreenOverlay'
import { CAMERA_FOV, CAMERA_POSITION } from '@/cores/const/scene'
import { CHANNEL_SWITCH_LOADING_DURATION } from '@/cores/const/screen'
import { SCREEN_PAGES } from '@/data/screenPages'
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

  // 旋鈕換頁的短暫 loading——跟大的 phase 狀態機分開存，因為它只會在
  // phase==='idle' 時發生，不影響鏡頭，只是讓螢幕貼圖短暫轉成雜訊再顯示
  // 新頁，用獨立的 boolean 比塞進 ScreenPhase 的列舉簡單很多。
  const [isChannelLoading, setIsChannelLoading] = useState(false)
  const channelLoadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (channelLoadingTimeoutRef.current) clearTimeout(channelLoadingTimeoutRef.current)
    }
  }, [])

  const handleChannelChange = (index: number) => {
    setPageIndex(index)
    setIsChannelLoading(true)
    if (channelLoadingTimeoutRef.current) clearTimeout(channelLoadingTimeoutRef.current)
    channelLoadingTimeoutRef.current = setTimeout(() => {
      setIsChannelLoading(false)
    }, CHANNEL_SWITCH_LOADING_DURATION * 1000)
  }

  const currentPage = SCREEN_PAGES[pageIndex]

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
            pageIndex={pageIndex}
            pageCount={SCREEN_PAGES.length}
            page={currentPage}
            isChannelLoading={isChannelLoading}
            onChannelChange={handleChannelChange}
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
