import { RESUME_INTRO } from '@/data/resumeContent'
import { useTypewriter } from '@/hooks/useTypewriter'
import { PixelAvatar } from './PixelAvatar'
import styles from './ResumeIntroPage.module.css'

// 每字元間隔（毫秒）——bio 目前約 200 字，這個速度跑完大概 3~4 秒，
// 跟終端機逐行吐字的觀感接近，不會慢到讓人不耐煩。
const TYPEWRITER_MS_PER_CHAR = 18

// CH 01——個人簡介。放在 TerminalFrame 的缺角對話框裡（見 TerminalFrame.tsx）。
export function ResumeIntroPage() {
  const { displayed, done } = useTypewriter(RESUME_INTRO.bio, TYPEWRITER_MS_PER_CHAR)

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
          <p className={styles.bio}>
            {displayed}
            {!done && <span className={styles.cursor}>▌</span>}
          </p>
        </div>
      </div>
    </div>
  )
}
