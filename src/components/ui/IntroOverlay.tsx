import { INTRO_FADE_OUT_DURATION } from '@/cores/const/screen'
import styles from './IntroOverlay.module.css'

interface IntroOverlayProps {
  // true 的時候開始淡出（phase 從 'intro' 變成 'focusing' 的當下）——文字
  // 消失跟鏡頭運鏡是同時開始的兩個動畫，不是先等文字消失完才開始運鏡，
  // 呼叫端（MainScene）在同一次 phase 切換就會把兩邊都觸發。
  fadingOut: boolean
  onContinue: () => void
}

// 開場蓋在 Canvas 上層的全螢幕文字——不是 TV 螢幕上的內容，是整個網頁的
// 進場動畫。背景刻意透明（只加一層很淡的暗化，見 CSS），讓後面的 3D 場景
// （預設鏡頭角度看到的整台電視）還是看得到，文字是疊在畫面正中央的。
export function IntroOverlay({ fadingOut, onContinue }: IntroOverlayProps) {
  return (
    <div
      className={styles.overlay}
      data-fading={fadingOut || undefined}
      style={{ transitionDuration: `${INTRO_FADE_OUT_DURATION}s` }}
      // fadingOut 期間關掉點擊——動畫途中再點一次不該重複觸發 onContinue
      // （phase 已經離開 intro，重複觸發也不會有效果，但保險起見還是擋掉）。
      onClick={fadingOut ? undefined : onContinue}
    >
      <div className={styles.content}>
        <p className={styles.greeting}>Hello, world.</p>
        <p className={styles.hint}>點擊畫面繼續</p>
      </div>
    </div>
  )
}
