import { RESUME_INTRO } from '@/data/resumeContent'
import { PixelAvatar } from './PixelAvatar'
import styles from './ResumeIntroPage.module.css'

// CH 01——個人簡介。放在 ResumeFrame 的缺角對話框裡（見 ResumeFrame.tsx）。
export function ResumeIntroPage() {
  return (
    <div className={styles.layout}>
      <div className={styles.avatarCol}>
        <PixelAvatar />
        <span className={styles.caption}>guest.png</span>
      </div>

      <div className={styles.textCol}>
        <div className={styles.prompt}>&gt; whoami</div>
        <h1 className={styles.name}>
          <img src="/sprites/soul-red.png" alt="" className={styles.soul} />
          {RESUME_INTRO.name}
        </h1>

        <div className={styles.block}>
          <div className={styles.prompt}>&gt; role --print</div>
          <div className={styles.role}>{RESUME_INTRO.role}</div>
        </div>

        <div className={styles.block}>
          <div className={styles.prompt}>&gt; cat bio.txt</div>
          <p className={styles.bio}>{RESUME_INTRO.bio}</p>
        </div>
      </div>
    </div>
  )
}
