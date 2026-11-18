import { RESUME_INTRO } from '@/data/resumeContent'
import { useTypewriter } from '@/hooks/useTypewriter'
import styles from './ResumeIntroPage.module.css'

// 每字元間隔（毫秒）——bio 目前約 200 字，這個速度跑完大概 3~4 秒，
// 跟終端機逐行吐字的觀感接近，不會慢到讓人不耐煩。
const TYPEWRITER_MS_PER_CHAR = 18

// CH 01——個人簡介。放在 ResumeFrame 的對話框裡（見 ResumeFrame.tsx）——
// 頭像、姓名與年資等簡介在外框上方的圖片區（ResumeStageProfile），這裡只
// 負責對話內容：bio 用空行分段，每段前面加「* 」，逐字打出來。
export function ResumeIntroPage() {
  const { displayed, done, skip } = useTypewriter(RESUME_INTRO.bio, TYPEWRITER_MS_PER_CHAR)
  const paragraphs = displayed.split('\n\n')

  return (
    // 打完的內容再點一次沒有意義，只有還在跑的時候才接手勢——不然點完
    // 之後在文字上點來點去，游標一直變成手指形狀會很奇怪。
    <div className={styles.layout} onClick={done ? undefined : skip} data-skippable={done ? undefined : true}>
      {paragraphs.map((paragraph, i) => (
        <p key={i} className={styles.line}>
          <span className={styles.bullet}>*</span>
          {paragraph}
          {!done && i === paragraphs.length - 1 && <span className={styles.cursor}>▌</span>}
        </p>
      ))}
    </div>
  )
}
