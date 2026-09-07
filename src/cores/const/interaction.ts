// 點擊觸發的部件動畫共用調校參數（tray、旋鈕、DVD 盒）。放同一個檔案是因為
// 這些數字之後會互相比對、一起調——見 CLAUDE.md 的 Phase 計畫。

export const DVD_TRAY_OPEN_DISTANCE = 0.14 // tray 沿 +Z 滑出的距離（公尺）
export const DVD_TRAY_ANIM_DURATION = 0.5 // 秒

// 預設頁數是 0——資料層（channels/projects）都還沒做，現在沒有真正的內容
// 可以切，旋鈕先保持可以點，但點了不會動。等 Step 3／Phase 2 接上真實資料
// （個人頁面或插入的 DVD 作品數），才會傳非零的 pageCount 進來。
export const KNOB_DEFAULT_PAGE_COUNT = 0
export const KNOB_STEP_DURATION = 0.35 // 秒，每按一次的轉動動畫時間

export const DVD_CASE_OPEN_ANGLE = -2.4 // 弧度（約 -137°），封面掀開的角度
export const DVD_CASE_OPEN_DURATION = 0.5 // 秒

// 選片畫面：碟片飛到鏡頭前方排成一列，場景其他光源同時暗下去。
export const DVD_SELECTOR_DISTANCE = 1 // 碟片扇形排列的中心離鏡頭多遠
export const DVD_SELECTOR_ARC_SPACING = 0.45 // 每片碟沿鏡頭「右方向」展開的間距
export const DVD_SELECTOR_SCALE = 2 // 飛到選片位置後放大幾倍，原尺寸在這個距離下太小看不清楚
export const DVD_SELECTOR_FLY_DURATION = 0.6 // 秒，飛出/收回的動畫時間
export const SCENE_DIM_FACTOR = 0.03 // 選片時場景燈光乘上這個係數（趨近全黑但留一點層次）
export const SCENE_DIM_DURATION = 0.4 // 秒，燈光暗下/恢復的時間

// 選片畫面裡碟片的閒置自轉——hover 時停下來、轉正對鏡頭。
export const DVD_SELECTOR_SPIN_SPEED_X = 0.4 // 弧度/秒
export const DVD_SELECTOR_SPIN_SPEED_Y = 0.6 // 弧度/秒
export const DVD_SELECTOR_HOVER_SNAP_DURATION = 0.25 // 秒，hover 時轉正對鏡頭的時間
