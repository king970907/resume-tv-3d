import { RESUME_JOBS } from '@/data/resumeContent'
import styles from './ResumeExperiencePage.module.css'

// CH 03——工作經歷。時間軸節點用 Red SOUL 取代原本手刻的方塊小圖示。
export function ResumeExperiencePage() {
  return (
    <div className={styles.layout}>
      <div className={styles.prompt}>&gt; ls -la experience/</div>

      <div className={styles.timeline}>
        {RESUME_JOBS.map((job, i) => (
          <div key={`${job.company}-${job.dates}`} className={styles.entry}>
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
