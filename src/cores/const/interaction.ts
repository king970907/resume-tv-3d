// 點擊觸發的部件動畫共用調校參數（tray、旋鈕、DVD 盒）。放同一個檔案是因為
// 這些數字之後會互相比對、一起調——見 CLAUDE.md 的 Phase 計畫。

// tray 沿 +Z 滑出的距離（公尺）。原本 0.14——瀏覽器量過 DVD_Tray 世界座標
// 邊界框才發現這個值只讓 tray 平台（DVD_Tray_Base，本身縱深約 0.22m）
// 露出機身正面約 56%，看起來像「滑開一半」，不是真的彈出來。改成 0.2，
// 讓平台露出比例提高到約 83%，同時後緣還留一點點（約 17%）疊在機身裡，
// 視覺上還是「卡在滑軌裡」沒有整個脫離機身，比較像真的 DVD 托盤彈出。
export const DVD_TRAY_OPEN_DISTANCE = 0.2
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
// 沒被選中的碟片收起來（原地縮小消失）的時間——比飛出來短，退場俐落一點。
// 選片後這個常數還有第二個用途：被選中那一片要等其他兩片先縮小完、徹底
// 消失之後才開始自己的放片動畫（見 DVDSelector.tsx 的 insertingProjectId
// 分支）。原本兩邊是同時開始的，被選中的那片還沒開始移動、尺寸也還沒縮小
// 完，跟旁邊還沒完全消失的另外兩片距離太近（DVD_SELECTOR_ARC_SPACING
// 只有 0.45，放大到 DVD_SELECTOR_SCALE 倍的碟片彼此靠得很近），畫面上
// 看起來像選中的那片突然變大蓋到旁邊——實際上是三片一起還很大、還沒
// 分開的錯覺。改成先後順序，旁邊兩片完全消失之後，畫面清空了，被選中的
// 那片才開始動，就不會有互相重疊的錯覺。
export const DVD_SELECTOR_RETRACT_DURATION = DVD_SELECTOR_FLY_DURATION * 0.6 // 秒
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
// （跟其他碟片收起來同時發生）-> 選中的碟片縮小/邊飛邊翻正/放進槽裡
// （分三段，見下面三個 DURATION 常數）-> 停頓一下（讓畫面上看得出「碟片
// 已經在 player 裡了」）-> player 關 -> 螢幕顯示內容。
//
// 第一版是單純的 position/scale 直線 tween，角度完全不變——碟片全程維持
// 選片時「面向鏡頭」的朝向飛過去，看起來像整片貼圖平移過去，不像真的
// 被拿起來放進機器裡。改成三段式：
//   1. 原地縮小（DVD_INSERT_SHRINK_DURATION）：先從選片放大尺寸縮回接近
//      原始大小，感覺像「先把碟片捏小準備收好」，這時候還沒開始移動。
//   2. 邊飛邊翻正（DVD_INSERT_FLY_DURATION）：位置飛向 tray 正上方（留
//      DVD_INSERT_HOVER_HEIGHT 的高度差，不是一次到底），同時角度從
//      「面向鏡頭」翻成「躺平、正面朝上」——跟真的拿一片光碟放進托盤是
//      同一個動作次序。
//   3. 放下（DVD_INSERT_DROP_DURATION）：從 tray 正上方做最後一小段下降
//      到精確的插槽位置，模擬「放下」而不是整段飛行一次到位。
export const DVD_INSERT_SHRINK_DURATION = 0.25 // 秒
export const DVD_INSERT_FLY_DURATION = 0.6 // 秒，邊飛邊翻正的時間
export const DVD_INSERT_DROP_DURATION = 0.2 // 秒
// 邊飛邊翻正的終點比最終插槽位置高多少（公尺）——留給第3段「放下」用，
// 不然整段飛行只剩翻正、沒有「放下」的動作可以做。
export const DVD_INSERT_HOVER_HEIGHT = 0.04
// 碟片在選片畫面被放大到 DVD_SELECTOR_SCALE(2倍)方便看清楚，飛進 player
// 時縮小回接近原始尺寸——真的放進去的碟片不該還維持選片時的誇張尺寸。
export const DVD_INSERT_SCALE_END = 1
// 碟片/tray 都到定位之後，多停頓一下再關 tray，讓使用者看得出「碟片已經
// 放進去了」，不是碟片一到位 tray 馬上關、動作黏在一起分不清楚。
export const DVD_INSERT_SETTLE_PAUSE = 0.2 // 秒
