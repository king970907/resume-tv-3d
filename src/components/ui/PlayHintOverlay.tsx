import styles from './PlayHintOverlay.module.css'

interface PlayHintOverlayProps {
  // 是不是該顯示——由呼叫端判斷（放片完成、且是正常瀏覽姿態，不是全螢幕
  // /盒子特寫等其他鏡頭階段），這個元件自己不判斷業務邏輯，只負責淡入
  // 淡出。跟 IntroOverlay/FullscreenOverlay 不同，這裡選擇「一直掛載、
  // 用 opacity 切換」而不是「條件式掛載/卸載」——因為這個提示永遠不
  // 攔截點擊（見下面 CSS 的 pointer-events），不需要那兩個全螢幕疊層
  // 那種「淡出動畫播完才真的卸載、卸載前還要擋互動」的兩階段機制。
  visible: boolean
  // 是不是正在播放——決定顯示「按下播放」還是「再按一次停止」，見
  // MainScene.tsx 呼叫端的 isPlaying/insertedProject 狀態說明。
  isPlaying: boolean
}

export function PlayHintOverlay({ visible, isPlaying }: PlayHintOverlayProps) {
  return (
    <div className={styles.overlay} data-visible={visible || undefined}>
      <p className={styles.hint}>
        {isPlaying ? '■ 再按一次停止播放' : '▶ 按下播放鍵開始播放'}
      </p>
    </div>
  )
}
