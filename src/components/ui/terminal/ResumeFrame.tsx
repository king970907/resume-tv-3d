import type { ReactNode } from 'react'
import { RESUME_INTRO } from '@/data/resumeContent'
import styles from './ResumeFrame.module.css'

// 履歷三頁的選項按鈕文字，順序對應頁碼（0 簡介、1 技能、2 經歷），跟
// FullscreenOverlay 裡依 resumePageIndex 挑頁面內容的順序一致。
const RESUME_TAB_LABELS = ['簡介', '技能', '經歷']

interface ResumeFrameProps {
  // 目前第幾頁（0-based）。
  page: number
  onSelectPage: (index: number) => void
  // 上方圖片區的內容——頭像或大標題，見下面兩個 ResumeStage* 元件。
  stage: ReactNode
  // 中間對話框的內容（各頁面元件）。
  children: ReactNode
}

// 履歷全螢幕頁的外殼——Undertale 戰鬥畫面的版面：上方圖片區（小）、中間
// 白框對話框放資訊（大）、下方狀態列＋選項按鈕直接切換頁面。取代舊版共用
// 的 TerminalFrame（上一頁/下一頁）；作品頁仍用 TerminalFrame，沒有跟著
// 改（使用者指定作品頁維持原本的方式）。
export function ResumeFrame({ page, onSelectPage, stage, children }: ResumeFrameProps) {
  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className={styles.frame}>
      <div className={styles.scanlines} />

      <div className={styles.stage}>{stage}</div>

      <div className={styles.dialog}>
        <div className={styles.dialogBorder} />
        <div className={styles.dialogFill} />
        <div className={styles.dialogContent}>{children}</div>
      </div>

      <div className={styles.status}>
        <span className={styles.name}>{RESUME_INTRO.name}</span>
        <span className={styles.channel}>CH {pad(page + 1)}/{pad(RESUME_TAB_LABELS.length)}</span>
      </div>

      <div className={styles.options}>
        {RESUME_TAB_LABELS.map((label, i) => (
          <button
            key={label}
            type="button"
            className={styles.option}
            data-selected={i === page || undefined}
            aria-current={i === page ? 'page' : undefined}
            onClick={() => onSelectPage(i)}
          >
            <img src="/sprites/soul-red.png" alt="" className={styles.optionSoul} />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

// 簡介頁的上方圖片：像素頭像。
export function ResumeStageAvatar() {
  return <img src="/sprites/avatar.png" alt="" className={styles.stageAvatar} />
}

// 技能/經歷頁的上方圖片：大標題加 SOUL。
export function ResumeStageTitle({ text }: { text: string }) {
  return (
    <div className={styles.stageTitle}>
      <img src="/sprites/soul-red.png" alt="" className={styles.stageSoul} />
      {text}
    </div>
  )
}
