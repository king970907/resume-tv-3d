import { useEffect, useRef } from 'react'
import gsap from 'gsap'
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
  const flickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    // 這個元件只在 phase 進到 'fullscreen' 的當下才會掛載（見
    // MainScene.tsx 的條件渲染），所以「掛載」本身就是「登場」的時機，
    // 不用另外判斷 fadingOut——退場（fadingOut=true）是同一個元件實例
    // 重新渲染，不會重新觸發這個 effect。
    //
    // 疊層本身的淡入淡出是 CSS transition（見下面 .overlay 的
    // transitionDuration），這裡疊加一層快速閃爍——選片點擊螢幕→運鏡→
    // 雜訊→切全螢幕這條路，雜訊(zoom-loading)已經在 3D 螢幕貼圖上演過
    // 一次「訊號不穩」，切到這層 DOM 疊層的瞬間再閃一下同色系的光，感覺
    // 像「訊號正式鎖定」的收尾，不是無中生有的裝飾。用 steps() 這種
    // 離散、不平滑的 ease 是刻意的——平滑的 power/sine 曲線閃爍看起來
    // 像呼吸燈，steps() 才有數位訊號忽亮忽暗的頓挫感。
    const flicker = flickerRef.current
    if (!flicker) return
    gsap.set(flicker, { opacity: 1 })
    const timeline = gsap.timeline()
    timeline
      .to(flicker, { opacity: 0.1, duration: 0.05, ease: 'steps(1)' })
      .to(flicker, { opacity: 0.75, duration: 0.04, ease: 'steps(1)' })
      .to(flicker, { opacity: 0.05, duration: 0.05, ease: 'steps(1)' })
      .to(flicker, { opacity: 0.4, duration: 0.04, ease: 'steps(1)' })
      .to(flicker, { opacity: 0, duration: 0.18, ease: 'power1.out' })
    return () => {
      timeline.kill()
    }
  }, [])

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

      {/* 登場閃爍層——蓋在最上面但不擋點擊，動畫跑完就停在 opacity:0，
          不用額外卸載，反正 fadingOut 退場時也不會再摸到它。 */}
      <div ref={flickerRef} className={styles.flicker} style={{ background: page.accentColor }} />
    </div>
  )
}
