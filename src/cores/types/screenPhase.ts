// 「開場 → 聚焦 → loading → 看畫面 → 全螢幕」這條流程的狀態機。狀態本身
// 存在 MainScene.tsx（Canvas 外層），因為開場文字/全螢幕疊層是真正的
// DOM，要跟 Canvas 平行渲染；實際的鏡頭運鏡/計時邏輯則交給 Experience.tsx
// （透過 onPhaseChange 回報狀態該往下一步走了），兩邊透過這個共用型別
// 溝通，不用互相 import 對方的元件。
//
// 狀態轉換：
//   intro        開場全螢幕文字，螢幕本身是關的（黑）
//     └─(使用者點擊 IntroOverlay)─▶ focusing
//   focusing     文字淡出 + 鏡頭運鏡到螢幕正面聚焦姿態
//     └─(運鏡完成，Experience 觸發)─▶ loading
//   loading      螢幕貼圖畫雜訊，鏡頭維持聚焦姿態不動
//     └─(等待固定時間，Experience 觸發)─▶ idle
//   idle         螢幕顯示畫面內容，使用者可以自由轉鏡頭、按旋鈕換頁
//     └─(使用者點擊螢幕)─▶ zooming-in
//   zooming-in   鏡頭快速運鏡貼近螢幕
//     └─(運鏡完成，Experience 觸發)─▶ zoom-loading
//   zoom-loading 螢幕貼圖畫雜訊，鏡頭維持貼近螢幕的姿態不動——跟開場的
//                loading 是同一種「訊號切換」感覺，但這裡是「點螢幕準備
//                全螢幕」的過場，不是「電視剛開機」，兩個階段分開命名。
//     └─(等待固定時間，Experience 觸發)─▶ fullscreen
//   fullscreen   真正的 2D DOM 疊層蓋滿視窗，3D 鏡頭停在貼近螢幕的位置
//     └─(使用者關閉 FullscreenOverlay)─▶ zooming-out
//   zooming-out  疊層淡出 + 鏡頭運鏡退回聚焦姿態
//     └─(運鏡完成，Experience 觸發)─▶ idle
export type ScreenPhase =
  | 'intro'
  | 'focusing'
  | 'loading'
  | 'idle'
  | 'zooming-in'
  | 'zoom-loading'
  | 'fullscreen'
  | 'zooming-out'
