import styles from './PixelAvatar.module.css'

// 真人像素頭像（使用者提供的圖，見 public/sprites/avatar.png）——原本是
// 手刻的 16x16 佔位剪影，換成真圖後改成單純的 <img>，呼叫端
// （ResumeIntroPage）的介面不用改。
export function PixelAvatar() {
  return <img src="/sprites/avatar.png" alt="" className={styles.image} />
}
