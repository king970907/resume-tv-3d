import type { Project } from '@/cores/types/project'
import styles from './ProjectPage.module.css'

interface ProjectPageProps {
  project: Project
}

// 作品頁內容——放在 TerminalFrame 的缺角對話框裡（見 TerminalFrame.tsx）。
// 縮圖佔滿上半部（使用者確認過的比例，見對話紀錄裡的 Artifact 切版），
// 下半部固定高度放標題/技術標籤/簡介/連結按鈕。
export function ProjectPage({ project }: ProjectPageProps) {
  return (
    <div className={styles.layout}>
      <div className={styles.thumbnailWrap}>
        {project.thumbnail ? (
          <img src={project.thumbnail} alt="" className={styles.thumbnailImage} />
        ) : (
          <div className={styles.thumbnailPlaceholder}>
            <span className={styles.thumbnailLabel}>[ SCREENSHOT ]</span>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.headerRow}>
          <h1 className={styles.title}>
            <img src="/sprites/soul-red.png" alt="" className={styles.soul} />
            {project.title.toUpperCase()}
          </h1>
          <div className={styles.tags}>
            {project.tech.map((tech) => (
              <span key={tech} className={styles.tag}>{tech.toUpperCase()}</span>
            ))}
          </div>
        </div>

        <p className={styles.desc}>{project.description}</p>

        {/* 沒有 url 的作品（目前佔位資料都沒有）就不顯示連結按鈕，不是顯示
            一顆按下去沒反應的死按鈕。 */}
        {project.url && (
          <a className={styles.linkButton} href={project.url} target="_blank" rel="noopener noreferrer">
            [ ENTER ] 前往專案網站 ›
          </a>
        )}
      </div>
    </div>
  )
}
