import type { ReactNode } from 'react'
import styles from './TerminalFrame.module.css'

interface TerminalFrameProps {
  // 頂部系統列左側的標籤——履歷頁用 "SYS://RESUME.EXE"、作品頁用
  // "SYS://PROJECTS.EXE"，各自的呼叫端自己決定字串，這個元件不判斷
  // 內容來源。
  systemLabel: string
  // 右上角徽章/底部頻道按鈕的前綴——履歷頁是 "CH"（頻道旋鈕），作品頁
  // 是 "DVD"（音量旋鈕切放進 player 的哪一片），語意不同不能共用同一個
  // 寫死的字串。
  channelLabel: string
  // 目前第幾台（1-based，畫面上顯示用）、總共幾台——底下頻道按鈕跟右上角
  // 徽章都要換算上一台/下一台，繞頭尾（第3台的下一台繞回第1台）。
  channel: number
  channelCount: number
  onPrevChannel: () => void
  onNextChannel: () => void
  children: ReactNode
}

// 履歷/作品全螢幕頁共用的外殼——Undertale 對話框那套視覺語彙（缺角白框
// 黑底、SOUL 像素小圖示、終端機提示列、掃描線）集中在這裡，原本只服務
// 履歷三頁（叫 ResumeFrame），作品頁確定要沿用同一套視覺之後改名搬到
// 這裡，systemLabel/channelLabel 兩個字串讓兩邊各自代入不同用詞，畫面
// 骨架/CSS 完全不用重畫一份。呼叫端（頁面內容元件）只需要負責 children
// 裡的實際內容排版。
export function TerminalFrame({ systemLabel, channelLabel, channel, channelCount, onPrevChannel, onNextChannel, children }: TerminalFrameProps) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const prevChannel = channel === 1 ? channelCount : channel - 1
  const nextChannel = channel === channelCount ? 1 : channel + 1

  return (
    <div className={styles.frame}>
      <div className={styles.scanlines} />
      <div className={styles.vignette} />

      <div className={styles.systemRow}>
        <span className={styles.systemLabel}>{systemLabel}</span>
        <div className={styles.badge}>
          {/* Blue SOUL——只在這裡當「目前頻道」的標記用，跟內文裡重複出現
              的 Red SOUL 項目符號做區分，兩種顏色各自有固定用途，不是
              隨機挑色。 */}
          <img src="/sprites/soul-blue.png" alt="" className={styles.soulBadge} />
          <span>{channelLabel} {pad(channel)}/{pad(channelCount)}</span>
        </div>
      </div>

      {/* Undertale 對話框：兩層 clip-path 疊出缺角白框，跟切版 Artifact
          demo 是同一個做法（見對話記錄），只是從 <div style> 內聯寫法搬進
          CSS Module。 */}
      <div className={styles.box}>
        <div className={styles.boxBorder} />
        <div className={styles.boxFill} />
        <div className={styles.boxContent}>{children}</div>
        <div className={styles.continueHint}>
          <img src="/sprites/xbox-a.png" alt="" className={styles.hintIcon} />
          <span className={styles.tri}>▼</span>
        </div>
      </div>

      <div className={styles.navRow}>
        <button type="button" className={styles.navButton} onClick={onPrevChannel}>‹ {channelLabel} {pad(prevChannel)}</button>
        <button type="button" className={styles.navButton} onClick={onNextChannel}>{channelLabel} {pad(nextChannel)} ›</button>
      </div>
    </div>
  )
}
