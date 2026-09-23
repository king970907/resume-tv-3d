import { useEffect } from 'react'
import { FULLSCREEN_OVERLAY_FADE_DURATION } from '@/cores/const/screen'
import { RESUME_PAGES } from '@/data/screenPages'
import { PROJECTS } from '@/data/projects'
import { TerminalFrame } from '@/components/ui/terminal/TerminalFrame'
import { ResumeIntroPage } from '@/components/ui/resume/ResumeIntroPage'
import { ResumeSkillsPage } from '@/components/ui/resume/ResumeSkillsPage'
import { ResumeExperiencePage } from '@/components/ui/resume/ResumeExperiencePage'
import { ProjectPage } from '@/components/ui/projects/ProjectPage'
import styles from './FullscreenOverlay.module.css'

interface FullscreenOverlayProps {
  // true 的時候開始淡出（使用者按了關閉，phase 進到 'zooming-out'）——
  // 疊層淡出跟鏡頭退回聚焦姿態也是同時開始的兩個動畫，理由跟 IntroOverlay
  // 的 fadingOut 一樣。
  fadingOut: boolean
  onClose: () => void
  // 現在顯示的是不是履歷頁、第幾頁——不是 null 時代表這是履歷（不是播放中
  // 的作品集），用 TerminalFrame + Resume*Page 畫面。跟 projectPageIndex
  // 恰好互斥（isPlaying 為 true 時履歷這邊是 null、作品那邊才有值，反之
  // 亦然），由 MainScene 依 isPlaying 算出來傳進來。
  resumePageIndex: number | null
  onResumeChannelChange: (index: number) => void
  // 播放中顯示第幾個作品——理由/跟 resumePageIndex 互斥的關係同上。
  projectPageIndex: number | null
  onProjectChannelChange: (index: number) => void
}

// 點擊螢幕、鏡頭運鏡貼近後切換成的真 2D 疊層——蓋滿整個瀏覽器視窗，內容
// 比 3D 貼圖版本銳利，跟 canvas 貼圖（screenCanvas.ts）共用同一份
// ScreenPage 資料，兩邊配色/文字要對得上。
//
// 登場/退場只靠簡單的 CSS opacity transition（見下面 .overlay）淡入淡出
// ——原本試過在登場時額外疊一層 gsap 閃爍當「訊號鎖定」的收尾效果，使用
// 者反應閃爍感太強、不舒服，拿掉了。zoom-loading 階段的雜訊已經足夠
// 表達「訊號切換」，這層疊層不需要再自己閃一次。
export function FullscreenOverlay({ fadingOut, onClose, resumePageIndex, onResumeChannelChange, projectPageIndex, onProjectChannelChange }: FullscreenOverlayProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const isResumePage = resumePageIndex !== null
  const resumeChannelCount = RESUME_PAGES.length
  const projectChannelCount = PROJECTS.length

  return (
    <div
      className={styles.overlay}
      data-fading={fadingOut || undefined}
      style={{
        transitionDuration: `${FULLSCREEN_OVERLAY_FADE_DURATION}s`,
        // 純色不透明背景，不用漸層——原本想用 radial-gradient 疊一點當頁
        // 強調色的暈染效果，但漸層中心不透明度沒抓好，實測時中央文字區
        // 還是透得出鏡頭停在螢幕正前方那個位置的 3D 場景（連同螢幕自己
        // 用 canvas 貼圖畫的同一份文字），變成跟疊層文字重疊的雙重曝光。
        // 全螢幕疊層的重點是「乾淨銳利地蓋滿視窗」，先用穩妥的純色，暈染
        // 效果之後再回來做也不遲。
        background: '#07080a',
      }}
    >
      {/* 關閉鍵原本在履歷頁試過換成 MERCY 素材 + Xbox B 提示圖示，使用者
          看過覺得還是單純的 ✕ 比較好認，改回跟作品集播放頁共用同一顆。 */}
      <button type="button" className={styles.closeButton} onClick={onClose} aria-label="關閉全螢幕">
        ✕
      </button>

      {isResumePage && (
        <TerminalFrame
          systemLabel="SYS://RESUME.EXE"
          channelLabel="CH"
          channel={resumePageIndex + 1}
          channelCount={resumeChannelCount}
          onPrevChannel={() => onResumeChannelChange((resumePageIndex + resumeChannelCount - 1) % resumeChannelCount)}
          onNextChannel={() => onResumeChannelChange((resumePageIndex + 1) % resumeChannelCount)}
        >
          {resumePageIndex === 0 && <ResumeIntroPage />}
          {resumePageIndex === 1 && <ResumeSkillsPage />}
          {resumePageIndex === 2 && <ResumeExperiencePage />}
        </TerminalFrame>
      )}

      {projectPageIndex !== null && (
        <TerminalFrame
          systemLabel="SYS://PROJECTS.EXE"
          channelLabel="DVD"
          channel={projectPageIndex + 1}
          channelCount={projectChannelCount}
          onPrevChannel={() => onProjectChannelChange((projectPageIndex + projectChannelCount - 1) % projectChannelCount)}
          onNextChannel={() => onProjectChannelChange((projectPageIndex + 1) % projectChannelCount)}
        >
          <ProjectPage project={PROJECTS[projectPageIndex]} />
        </TerminalFrame>
      )}
    </div>
  )
}
