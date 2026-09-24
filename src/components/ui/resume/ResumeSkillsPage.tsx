import { RESUME_SKILLS } from '@/data/resumeContent'
import styles from './ResumeSkillsPage.module.css'

const SEGMENT_COUNT = 10

// 血條填滿動畫的間隔——每列（一個技能）之間錯開 ROW_STAGGER_MS，同一列
// 裡的每一格再錯開 SEGMENT_STAGGER_MS，兩層疊加做出「一列接一列、
// 一格接一格」由上到下、由左到右填滿的效果，不是所有格子同時彈出來。
const ROW_STAGGER_MS = 60
const SEGMENT_STAGGER_MS = 25

// CH 02——技能。等級用分段像素條（像 RPG 血條）表示，不用百分比數字，
// 跟頁面整體的遊戲選單語感一致。
export function ResumeSkillsPage() {
  let rowIndex = 0

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
            {category.skills.map((skill) => {
              const rowDelay = rowIndex++ * ROW_STAGGER_MS
              return (
                <div key={skill.name} className={styles.skillRow}>
                  <span className={styles.skillName}>{skill.name}</span>
                  <div className={styles.segments}>
                    {Array.from({ length: SEGMENT_COUNT }, (_, i) => {
                      const filled = i < skill.level
                      return (
                        <div
                          key={i}
                          className={styles.segment}
                          data-filled={filled || undefined}
                          style={{
                            background: filled ? '#eef0e6' : 'transparent',
                            animationDelay: filled ? `${rowDelay + i * SEGMENT_STAGGER_MS}ms` : undefined,
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
