import { INTRO_FADE_OUT_DURATION } from '@/cores/const/screen'
import styles from './IntroOverlay.module.css'

// 進度條格數——跟履歷技能頁的血條（ResumeSkillsPage）同一套像素風格，
// 這裡格數抓多一點（20），純粹因為載入進度是連續數字，格數多一點
// 才看得出漸進的變化，不會兩三格就跳滿。
const PROGRESS_SEGMENT_COUNT = 20

interface IntroOverlayProps {
  // true 的時候開始淡出（phase 從 'intro' 變成 'focusing' 的當下）——文字
  // 消失跟鏡頭運鏡是同時開始的兩個動畫，不是先等文字消失完才開始運鏡，
  // 呼叫端（MainScene）在同一次 phase 切換就會把兩邊都觸發。
  fadingOut: boolean
  // Blender 模型的載入進度（0~100，見 MainScene.tsx 的 assetsProgress
  // 說明）——沒到 100 之前顯示像素風進度條取代「點擊畫面繼續」提示；
  // 這段期間點擊還是會被接住（onContinue 照樣呼叫），只是實際運鏡會等
  // 載完才開始，見 MainScene.tsx 的 pendingContinue。
  progress: number
  onContinue: () => void
}

// 開場蓋在 Canvas 上層的全螢幕文字——不是 TV 螢幕上的內容，是整個網頁的
// 進場動畫。背景刻意透明（只加一層很淡的暗化，見 CSS），讓後面的 3D 場景
// （預設鏡頭角度看到的整台電視）還是看得到，文字是疊在畫面正中央的。
export function IntroOverlay({ fadingOut, progress, onContinue }: IntroOverlayProps) {
  const ready = progress >= 100
  const filledCount = Math.min(PROGRESS_SEGMENT_COUNT, Math.floor((progress / 100) * PROGRESS_SEGMENT_COUNT))

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
        {ready ? (
          <p className={styles.hint}>點擊畫面繼續</p>
        ) : (
          <div className={styles.progressBar} role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
            {Array.from({ length: PROGRESS_SEGMENT_COUNT }, (_, i) => (
              <div key={i} className={styles.progressSegment} data-filled={i < filledCount || undefined} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
