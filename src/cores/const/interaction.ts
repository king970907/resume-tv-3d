// 點擊觸發的部件動畫共用調校參數（tray、旋鈕、DVD 盒）。放同一個檔案是因為
// 這些數字之後會互相比對、一起調——見 CLAUDE.md 的 Phase 計畫。

export const DVD_TRAY_OPEN_DISTANCE = 0.14 // tray 沿 +Z 滑出的距離（公尺）
export const DVD_TRAY_ANIM_DURATION = 0.5 // 秒

// 沒有插 DVD 時的預設頁數：個人頁／技能／經歷／聯絡方式。插入 DVD 後頁數
// 會改成該片作品數量（Step 3 才會接），每格角度永遠是 360° / 頁數，不寫死。
export const KNOB_DEFAULT_PAGE_COUNT = 4
export const KNOB_STEP_DURATION = 0.35 // 秒，每按一次的轉動動畫時間
