import { RESUME_SKILLS } from '@/data/resumeContent'
import styles from './ResumeSkillsPage.module.css'

const SEGMENT_COUNT = 8

// CH 02——技能。等級用分段像素條（像 RPG 血條）表示，不用百分比數字，
// 跟頁面整體的遊戲選單語感一致。
export function ResumeSkillsPage() {
  return (
    <div className={styles.layout}>
      <div className={styles.prompt}>&gt; cat skills.txt</div>

      <div className={styles.categories}>
        {RESUME_SKILLS.map((category) => (
          <div key={category.name} className={styles.category}>
            <div className={styles.categoryName}>
              <img src="/sprites/soul-red.png" alt="" className={styles.soul} />
              {category.name}
            </div>
            {category.skills.map((skill) => (
              <div key={skill.name} className={styles.skillRow}>
                <span className={styles.skillName}>{skill.name}</span>
                <div className={styles.segments}>
                  {Array.from({ length: SEGMENT_COUNT }, (_, i) => (
                    <div
                      key={i}
                      className={styles.segment}
                      style={{ background: i < skill.level ? '#eef0e6' : 'transparent' }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
