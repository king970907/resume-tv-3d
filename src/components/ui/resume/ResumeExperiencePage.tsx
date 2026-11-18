import { useState } from 'react'
import { RESUME_JOBS } from '@/data/resumeContent'
import styles from './ResumeExperiencePage.module.css'

// 每張卡之間錯開的時間——比較新的工作先出現（陣列本身就是新到舊排序），
// 一張接一張往下冒出來，不是全部一次跳出來。
const ENTRY_STAGGER_MS = 180

// CH 03——工作經歷。做成 Undertale 存檔畫面的卡片：每份工作一張，標題列
// 是職稱＋日期，下面一行是公司；點一張才展開詳細內容，同時間只展開一張
// （手風琴），不用像以前一次攤開所有條列、捲很長。預設展開最新一份。
export function ResumeExperiencePage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div className={styles.layout}>
      <div className={styles.prompt}>&gt; load save_file<span className={styles.cursor}>_</span></div>

      <div className={styles.saves}>
        {RESUME_JOBS.map((job, i) => {
          const isOpen = openIndex === i
          // 日期寫「… — NOW」代表還在職，標上閃爍的 NOW 徽章。
          const isCurrent = job.dates.includes('NOW')
          return (
            <div
              key={`${job.company}-${job.dates}`}
              className={styles.save}
              data-open={isOpen || undefined}
              style={{ animationDelay: `${i * ENTRY_STAGGER_MS}ms` }}
            >
              <button
                type="button"
                className={styles.head}
                aria-expanded={isOpen}
                onClick={() => setOpenIndex(isOpen ? null : i)}
              >
                <img src="/sprites/soul-red.png" alt="" className={styles.soul} />
                <span className={styles.row}>
                  <span className={styles.role}>
                    {job.role}
                    {isCurrent && <span className={styles.now}>NOW</span>}
                  </span>
                  <span className={styles.dates}>{job.dates}</span>
                </span>
                <span className={styles.company}>{job.company}</span>
              </button>

              {isOpen && (
                <div className={styles.detail}>
                  <p className={styles.desc}>{job.description}</p>
                  <ul className={styles.highlights}>
                    {job.highlights.map((highlight) => (
                      <li key={highlight}>{highlight}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
