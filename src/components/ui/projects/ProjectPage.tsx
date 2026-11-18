import type { Project } from '@/cores/types/project'
import { PROJECTS } from '@/data/projects'
import styles from './ProjectPage.module.css'

interface ProjectPageProps {
  project: Project
}

// 模組載入時就把所有作品截圖預載進瀏覽器快取。不預載的話，第一次切到另一
// 個作品時 <img> 的 src 才開始下載，圖還沒到之前畫面會短暫停在上一張
// 圖（使用者回報「第一次切換瞬間圖片沒換過去」）；第二次之後有快取就不會。
for (const { screenshot } of PROJECTS) {
  if (screenshot) new Image().src = screenshot
}

// 視窗標題列的檔名：取作品名第一個字（"PAZZO / UR Living" → "PAZZO.EXE"），
// 呼應外層 SYS://PROJECTS.EXE 的終端機語感，只是裝飾用。
function windowName(title: string): string {
  return `${title.split(/[\s/]+/)[0].toUpperCase()}.EXE`
}

// 作品頁內容——放在 TerminalFrame 的缺角對話框裡（見 TerminalFrame.tsx）。
// 上方是像素風視窗框包住截圖（標題列＋掃描線，像在 CRT 上看網頁），下方是
// 標題列＋ROLE/STACK/IMPACT 欄位＋連結按鈕。樣式是使用者看過靜態預覽後
// 確認的版本。
//
// 截圖用 project.screenshot，沒給值就顯示像素風佔位方塊。不用
// project.thumbnail/caseCover——那兩個是給 3D 場景的 DVD 光碟標籤/盒子
// 封面用的（見 DVD.tsx/DVDCase.tsx），跟這裡是兩件事，使用者確認過不要
// 共用同一張圖。
export function ProjectPage({ project }: ProjectPageProps) {
  // 沒給值的欄位整列不顯示，不是顯示一個空標籤。
  const fields: { label: string; value: string }[] = [
    project.role ? { label: 'ROLE', value: project.role } : null,
    { label: 'STACK', value: project.tech.join(' · ') },
    project.impact ? { label: 'IMPACT', value: project.impact } : null,
  ].filter((field): field is { label: string; value: string } => field !== null)

  return (
    <div className={styles.layout}>
      <div className={styles.window}>
        <div className={styles.windowBar}>
          <span>{windowName(project.title)}</span>
          <span className={styles.windowButtons} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </div>
        <div className={styles.windowBody}>
          {project.screenshot ? (
            <img key={project.id} src={project.screenshot} alt={project.title} className={styles.screenshot} />
          ) : (
            <div className={styles.placeholder}>
              <span className={styles.placeholderLabel}>[ SCREENSHOT ]</span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.info}>
        <h1 className={styles.title}>
          <span className={styles.bullet}>*</span>
          {project.title.toUpperCase()}
          <span className={styles.cursor} aria-hidden="true">▮</span>
        </h1>

        <dl className={styles.fields}>
          {fields.map((field) => (
            <div key={field.label} className={styles.field}>
              <dt>{field.label}</dt>
              <dd>{field.value}</dd>
            </div>
          ))}
        </dl>

        {/* 沒有 url 的作品就不顯示連結按鈕，不是顯示一顆按下去沒反應的
            死按鈕。唯一的選項，所以 SOUL 游標固定停在上面（選取狀態）。 */}
        {project.url && (
          <a className={styles.linkButton} href={project.url} target="_blank" rel="noopener noreferrer">
            <img src="/sprites/soul-red.png" alt="" className={styles.linkSoul} />
            查看網站
          </a>
        )}
      </div>
    </div>
  )
}
