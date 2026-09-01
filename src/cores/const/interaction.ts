// 點擊觸發的部件動畫共用調校參數（tray、旋鈕、DVD 盒）。放同一個檔案是因為
// 這些數字之後會互相比對、一起調——見 CLAUDE.md 的 Phase 計畫。

export const DVD_TRAY_OPEN_DISTANCE = 0.14 // tray 沿 +Z 滑出的距離（公尺）
export const DVD_TRAY_ANIM_DURATION = 0.5 // 秒

export const KNOB_DETENT_ANGLE = Math.PI / 6 // 每個頻道檔位的角度（30°）
export const KNOB_DRAG_SENSITIVITY = 0.01 // 每拖曳 1 像素對應轉動的弧度
export const KNOB_SNAP_DURATION = 0.3 // 放開後 snap 到最近檔位要花的秒數
