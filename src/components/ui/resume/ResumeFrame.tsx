import type { ReactNode } from 'react'
import styles from './ResumeFrame.module.css'

interface ResumeFrameProps {
  // 目前第幾台（1-based，畫面上顯示用）、總共幾台——底下頻道按鈕跟右上角
  // 徽章都要換算上一台/下一台，繞頭尾（第3台的下一台繞回第1台）。
  channel: number
  channelCount: number
  onPrevChannel: () => void
  onNextChannel: () => void
  children: ReactNode
}

// 履歷全螢幕三頁共用的外殼——Undertale 對話框那套視覺語彙（缺角白框黑底、
// SOUL 像素小圖示、終端機提示列、掃描線）集中在這裡，三個頁面元件
// （ResumeIntroPage/ResumeSkillsPage/ResumeExperiencePage）只需要負責
// children 裡的實際內容排版，不用各自重畫一次外框。
export function ResumeFrame({ channel, channelCount, onPrevChannel, onNextChannel, children }: ResumeFrameProps) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const prevChannel = channel === 1 ? channelCount : channel - 1
  const nextChannel = channel === channelCount ? 1 : channel + 1

  return (
    <div className={styles.frame}>
      <div className={styles.scanlines} />
      <div className={styles.vignette} />

      <div className={styles.systemRow}>
        <span className={styles.systemLabel}>SYS://RESUME.EXE</span>
        <div className={styles.badge}>
          {/* Blue SOUL——只在這裡當「目前頻道」的標記用，跟內文裡重複出現
              的 Red SOUL 項目符號做區分，兩種顏色各自有固定用途，不是
              隨機挑色。 */}
          <img src="/sprites/soul-blue.png" alt="" className={styles.soulBadge} />
          <span>CH {pad(channel)}/{pad(channelCount)}</span>
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
        <button type="button" className={styles.navButton} onClick={onPrevChannel}>‹ CH {pad(prevChannel)}</button>
        <button type="button" className={styles.navButton} onClick={onNextChannel}>CH {pad(nextChannel)} ›</button>
      </div>
    </div>
  )
}
