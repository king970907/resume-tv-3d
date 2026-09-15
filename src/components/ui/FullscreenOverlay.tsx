import { useEffect } from 'react'
import { FULLSCREEN_OVERLAY_FADE_DURATION } from '@/cores/const/screen'
import type { ScreenPage } from '@/data/screenPages'
import styles from './FullscreenOverlay.module.css'

interface FullscreenOverlayProps {
  page: ScreenPage
  // true 的時候開始淡出（使用者按了關閉，phase 進到 'zooming-out'）——
  // 疊層淡出跟鏡頭退回聚焦姿態也是同時開始的兩個動畫，理由跟 IntroOverlay
  // 的 fadingOut 一樣。
  fadingOut: boolean
  onClose: () => void
}

// 點擊螢幕、鏡頭運鏡貼近後切換成的真 2D 疊層——蓋滿整個瀏覽器視窗，內容
// 比 3D 貼圖版本銳利，跟 canvas 貼圖（screenCanvas.ts）共用同一份
// ScreenPage 資料，兩邊配色/文字要對得上。
export function FullscreenOverlay({ page, fadingOut, onClose }: FullscreenOverlayProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

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
      <button type="button" className={styles.closeButton} onClick={onClose} aria-label="關閉全螢幕">
        ✕
      </button>

      <div className={styles.content}>
        <p className={styles.title} style={{ color: page.accentColor }}>{page.title}</p>
        <p className={styles.subtitle}>{page.subtitle}</p>
      </div>
    </div>
  )
}
