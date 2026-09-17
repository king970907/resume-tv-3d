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

// 選片畫面：鏡頭運鏡貼近盒子特寫，場景其他光源同時暗下去。
export const SCENE_DIM_FACTOR = 0.15 // 選片時場景燈光乘上這個係數（趨近全黑但留一點層次）
export const SCENE_DIM_DURATION = 0.4 // 秒，燈光暗下/恢復的時間

// 開盒時鏡頭運鏡到盒子特寫姿態的時間——跟 screen.ts 的 CAMERA_FOCUS_
// DURATION 同一種「同時補間 position/target/fov」手法，見 Experience.tsx
// 對應的 effect、CAMERA_CASE_POSITION/TARGET/FOV（scene.ts）。
export const DVD_CASE_VIEW_DURATION = 0.6 // 秒

// 選片後把光碟「放進」DVD player 的整段流程：點光碟 -> player 開 ->
// 光碟邊飛邊翻正、越過 TV 上方、垂直降下、放進槽裡（分三段，見下面三個
// DURATION 常數）-> 停頓一下（讓畫面上看得出「光碟已經在 player 裡了」）
// -> player 關 -> 螢幕顯示內容。
//
// 原本選片畫面會把光碟放大 2 倍方便使用者看清楚，插入動畫因此要先有一段
// 「縮小」把尺寸縮回原始大小。現在光碟改成直接躺在盒子裡（原始尺寸、
// 沒有放大），不需要縮小這一段，直接從三段開始：
//   1. 邊飛邊翻正（DVD_INSERT_FLY_DURATION）：位置從盒子裡的靜置位置飛向
//      DVD_INSERT_CLEAR_POSITION（scene.ts）——tray 正上方、但維持在 TV
//      頂面以上的高度，不是直接飛向 tray 本身。同時角度從「盒子裡的
//      姿態」翻成「躺平、正面朝上」——跟真的拿一片光碟放進托盤是同一個
//      動作次序。原本這裡直接飛向 tray 正上方，會讓光碟在半路直接穿過
//      TV 機身（盒子在 TV 頂上、tray 在 TV 前方貼地處，兩點直線中間會
//      切過機身體積，使用者實測回報「移動過程中會穿過 TV」）——先飛到
//      這個「維持高度」的中繼點，水平位置對齊之後才降下，就不會有任何
//      一段路徑跟機身重疊。
//   2. 垂直降下（DVD_INSERT_DESCEND_DURATION）：從 DVD_INSERT_CLEAR_
//      POSITION 純粹往下降到 tray 正上方（留 DVD_INSERT_HOVER_HEIGHT
//      的高度差，不是一次到底，留給第3段做「放下」），x/z 這段不變。
//   3. 放下（DVD_INSERT_DROP_DURATION）：從 tray 正上方做最後一小段下降
//      到精確的插槽位置，模擬「放下」而不是整段飛行一次到位。
export const DVD_INSERT_FLY_DURATION = 0.6 // 秒，邊飛邊翻正、越過 TV 上方的時間
export const DVD_INSERT_DESCEND_DURATION = 0.3 // 秒，從 TV 上方垂直降到 tray 正上方的時間
export const DVD_INSERT_DROP_DURATION = 0.2 // 秒
// 邊飛邊翻正的終點比最終插槽位置高多少（公尺）——留給第2段「放下」用，
// 不然整段飛行只剩翻正、沒有「放下」的動作可以做。
export const DVD_INSERT_HOVER_HEIGHT = 0.04
// 光碟/tray 都到定位之後，多停頓一下再關 tray，讓使用者看得出「光碟已經
// 放進去了」，不是光碟一到位 tray 馬上關、動作黏在一起分不清楚。
export const DVD_INSERT_SETTLE_PAUSE = 0.2 // 秒

// player 上 LED 燈號「已就緒」狀態的呼吸動畫一個週期要多久——光碟放進去
// 但還沒按播放時，用這個燈號提示使用者「這裡可以按」，見 DVDPlayer.tsx。
export const DVD_LED_PULSE_DURATION = 1.1 // 秒
