import { RESUME_JOBS } from '@/data/resumeContent'
import styles from './ResumeExperiencePage.module.css'

// 每筆經歷之間錯開的時間——比較新的工作先出現（陣列本身就是新到舊排
// 序），一筆接一筆往下冒出來，不是全部經歷一次跳出來。
const ENTRY_STAGGER_MS = 180

// CH 03——工作經歷。時間軸節點用 Red SOUL 取代原本手刻的方塊小圖示。
export function ResumeExperiencePage() {
  return (
    <div className={styles.layout}>
      <div className={styles.prompt}>&gt; ls -la experience/</div>

      <div className={styles.timeline}>
        {RESUME_JOBS.map((job, i) => (
          <div
            key={`${job.company}-${job.dates}`}
            className={styles.entry}
            style={{ animationDelay: `${i * ENTRY_STAGGER_MS}ms` }}
          >
            <div className={styles.rail}>
              <img src="/sprites/soul-red.png" alt="" className={styles.soul} />
              {i < RESUME_JOBS.length - 1 && <div className={styles.line} />}
            </div>
            <div className={styles.body}>
              <div className={styles.dates}>{job.dates}</div>
              <div className={styles.title}>{job.role} @ {job.company}</div>
              <p className={styles.desc}>{job.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
