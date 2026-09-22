import styles from './PixelAvatar.module.css'

// 16x16 手刻的像素頭像剪影（頭+肩膀）——目前沒有真的大頭照，先用這個佔位，
// 之後有真實照片/插畫的話直接整個元件換掉，呼叫端（ResumeIntroPage）的
// 介面不用改。1 = 填色，0 = 透空。
const AVATAR_ROWS = [
  '0000011111100000',
  '0000111111110000',
  '0001111111111000',
  '0011111111111100',
  '0011111111111100',
  '0011111111111100',
  '0011111111111100',
  '0001111111111000',
  '0000111111110000',
  '0000011111100000',
  '0000000000000000',
  '0001111111111000',
  '0011111111111100',
  '0111111111111110',
  '1111111111111111',
  '1111111111111111',
]

export function PixelAvatar() {
  return (
    <div className={styles.grid}>
      {AVATAR_ROWS.flatMap((row, y) =>
        row.split('').map((cell, x) => (
          <div
            key={`${y}-${x}`}
            className={styles.cell}
            style={{ background: cell === '1' ? '#eef0e6' : 'transparent' }}
          />
        )),
      )}
    </div>
  )
}
