// 點擊觸發的部件動畫共用調校參數（tray、旋鈕、DVD 盒）。放同一個檔案是因為
// 這些數字之後會互相比對、一起調——見 CLAUDE.md 的 Phase 計畫。

export const DVD_TRAY_OPEN_DISTANCE = 0.14 // tray 沿 +Z 滑出的距離（公尺）
export const DVD_TRAY_ANIM_DURATION = 0.5 // 秒

// 預設頁數是 0——資料層（channels/projects）都還沒做，現在沒有真正的內容
// 可以切，旋鈕先保持可以點，但點了不會動。等 Step 3／Phase 2 接上真實資料
// （個人頁面或插入的 DVD 作品數），才會傳非零的 pageCount 進來。
export const KNOB_DEFAULT_PAGE_COUNT = 0
export const KNOB_STEP_DURATION = 0.35 // 秒，每按一次的轉動動畫時間
