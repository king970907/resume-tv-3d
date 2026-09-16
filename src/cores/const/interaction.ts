// 點擊觸發的部件動畫共用調校參數（tray、旋鈕、DVD 盒）。放同一個檔案是因為
// 這些數字之後會互相比對、一起調——見 CLAUDE.md 的 Phase 計畫。

export const DVD_TRAY_OPEN_DISTANCE = 0.14 // tray 沿 +Z 滑出的距離（公尺）
export const DVD_TRAY_ANIM_DURATION = 0.5 // 秒

// 預設4格（每次點擊轉90°：0°→90°→180°→270°→繞回0°）——先讓旋鈕機構本身
// 動起來，指標刻度看得出每次點擊的效果。等 Step 3／Phase 2 接上真實資料
// （個人頁面或插入的 DVD 作品數，見 src/data/projects.ts 的 PROJECTS，目前
// 3筆）再把這裡換成從資料算出來的實際頁數，不用動旋鈕本身的邏輯。
export const KNOB_DEFAULT_PAGE_COUNT = 4
export const KNOB_STEP_DURATION = 0.35 // 秒，每按一次的轉動動畫時間

// +1.9 弧度（約 109°）——真實 Blender 模型的前蓋鉸鏈掀開角度，Blender 裡
// 測過 100°~110° 這個量級是自然掀開、不會穿模的範圍（舊 placeholder 用的
// -137° 是配合當時那組雙 box 假鉸鏈調的，跟真實模型的鉸鏈幾何無關）。
// 正負號在 three.js 端另外用瀏覽器實測決定：負值會讓前蓋往下往前甩，蓋到
// TV 螢幕/旋鈕那一側（「開錯邊」）；正值才是往後上方掀開、不會擋到 TV。
export const DVD_CASE_OPEN_ANGLE = 1.9
export const DVD_CASE_OPEN_DURATION = 0.5 // 秒

// 選片畫面：碟片飛到鏡頭前方排成一列，場景其他光源同時暗下去。
export const DVD_SELECTOR_DISTANCE = 1 // 碟片扇形排列的中心離鏡頭多遠
export const DVD_SELECTOR_ARC_SPACING = 0.45 // 每片碟沿鏡頭「右方向」展開的間距
export const DVD_SELECTOR_SCALE = 2 // 飛到選片位置後放大幾倍，原尺寸在這個距離下太小看不清楚
export const DVD_SELECTOR_FLY_DURATION = 0.6 // 秒，飛出/收回的動畫時間
export const SCENE_DIM_FACTOR = 0.15 // 選片時場景燈光乘上這個係數（趨近全黑但留一點層次）
export const SCENE_DIM_DURATION = 0.4 // 秒，燈光暗下/恢復的時間

// 選片開啟時鏡頭要拉遠到的安全距離（離 CAMERA_TARGET 多遠）——碟片扇形
// 排列的位置是算「鏡頭前方 DVD_SELECTOR_DISTANCE 處」，使用者如果開盒前
// 剛好把鏡頭拉得比這個距離還近（OrbitControls 允許近到 ORBIT_MIN_DISTANCE
// =0.6），碟片會直接卡在 TV 機身裡面、穿模。這個距離抓在預設鏡頭位置
// （CAMERA_POSITION 離 CAMERA_TARGET 約 2.04）附近再留一點餘裕，只有目前
// 距離比這個近的時候才會往外拉，鏡頭已經比較遠的話不動它。
export const DVD_SELECTOR_CAMERA_DISTANCE = 2.2
export const DVD_SELECTOR_CAMERA_DOLLY_DURATION = 0.5 // 秒

// 選片畫面裡碟片的閒置自轉——hover 時停下來、轉正對鏡頭。
export const DVD_SELECTOR_SPIN_SPEED_X = 0.4 // 弧度/秒
export const DVD_SELECTOR_SPIN_SPEED_Y = 0.6 // 弧度/秒
export const DVD_SELECTOR_HOVER_SNAP_DURATION = 0.25 // 秒，hover 時轉正對鏡頭的時間

// 選片後把選中的碟片「放進」DVD player 的整段流程：點碟片 -> player 開
// （跟其他碟片收起來同時發生）-> 選中的碟片飛向 player -> 停頓一下
// （讓畫面上看得出「碟片已經在 player 裡了」）-> player 關 -> 螢幕顯示
// 內容。跟 DVD_SELECTOR_FLY_DURATION（碟片飛出來給你選）是同一種手法，
// 只是這次飛行終點是 DVD player 的 tray，不是鏡頭前方。
export const DVD_INSERT_FLY_DURATION = 0.6 // 秒，選中的碟片飛向 player 的時間
// 碟片在選片畫面被放大到 DVD_SELECTOR_SCALE(2倍)方便看清楚，飛進 player
// 時縮小回接近原始尺寸——真的放進去的碟片不該還維持選片時的誇張尺寸。
export const DVD_INSERT_SCALE_END = 1
// 碟片/tray 都到定位之後，多停頓一下再關 tray，讓使用者看得出「碟片已經
// 放進去了」，不是碟片一到位 tray 馬上關、動作黏在一起分不清楚。
export const DVD_INSERT_SETTLE_PAUSE = 0.2 // 秒
