// 1 unit = 1 公尺。真實世界參考尺寸（公分）× 1.2（展示尺度加成）換算來的。
// 之後要整組縮放的話保持這個比例——見 CLAUDE.md。

// TV_WIDTH/TV_DEPTH、DVD_PLAYER_WIDTH/DEPTH/LIP_* 這些原本是 RoundedBox
// placeholder 用的尺寸常數——TV 跟 DVD player 都換成 Blender 匯出的真實
// geometry 後，實際尺寸已經內建在 .glb 檔案裡，這些常數沒有地方在用了，
// 拿掉避免誤導（以為改這裡會影響模型大小，實際上不會）。
// 0.398m 是 TV 頂面實際世界座標高度減掉 DVD_PLAYER_HEIGHT 反推出來的
// （用瀏覽器量過 TV_Body 的 bounding box 確認頂面在 y≈0.4876）——原本沿用
// RoundedBox placeholder 時代的 0.48m，跟真實模型差了將近 0.1m，會讓疊在
// 上面的 DVD_CASE_REST_POSITION 懸空太高。
export const TV_HEIGHT = 0.398

// 0.09m 是 DVD_Body 在 Blender 裡的真實高度（用瀏覽器量過 bounding box
// 確認），不是隨便抓的——原本沿用 RoundedBox placeholder 時代的 0.06m，
// TV 疊上去時底部的木紋踏板因此陷進真實機身裡一截（真實機身比 placeholder
// 假設的還高 0.03m）。
export const DVD_PLAYER_HEIGHT = 0.09

// 真實 DVD case 在 Blender 裡的尺寸（見 blender-project/models/dvd-case/
// notes.md）——換成 Blender 匯出的真實 geometry 後，這三個數字不再決定
// case 長什麼樣子（那是 .glb 裡的事），但 DVDCase.tsx 拿它們來把 Blender
// 端「原點在左下角」的座標系重新置中，跟 DVD_CASE_REST_POSITION 的「置中
// 在原點」假設對起來，所以還留著，不是死代碼。
export const DVD_CASE_WIDTH = 0.2
export const DVD_CASE_HEIGHT = 0.17
export const DVD_CASE_DEPTH = 0.0105

// TV 疊在 player 頂面上；player 貼地（y = 0）。
// z 軸不是 0：TV 的 Blender 模型原點在「前臉底部中心」，機身往+z方向延伸；
// RetroTV.tsx 為了讓螢幕面向鏡頭，把整個模型繞 y 轉了180°，這個旋轉是繞著
// 模型自己的原點轉的，結果機身反而變成往 -z 延伸，整台 TV 因此整個偏向
// DVD player 的後半段（螢幕視角看起來像貼在後緣）。加上這個z偏移把機身
// 移回 DVD player 深度的中間（機身深度約0.28m，DVD_PLAYER_DEPTH=0.54m，
// 偏移量 = 機身深度/2 抵銷掉往後偏的量）。
//
// y 軸多加 0.0216：TV 原點是機身本體的底部，但底下的木紋踏板
// （TV_Base_Plinth）是往下凸出的腳座，比機身本體的底部還低 0.0216m
// （用 Blender 量過頂點座標確認）。只用 DVD_PLAYER_HEIGHT 對齊機身本體
// 底部的話，踏板會整個埋進 DVD player 機身裡看不到——這個偏移量把
// 「踏板的底部」（不是機身本體的底部）對齊到 DVD player 頂面。
const TV_PLINTH_OVERHANG = 0.0216
export const TV_POSITION: [number, number, number] = [0, DVD_PLAYER_HEIGHT + TV_PLINTH_OVERHANG, 0.14]

// z 軸偏移道理跟 TV_POSITION 一樣：DVD player 的 Blender 模型原點也在
// 「前臉底部中心」，機身往+z方向延伸，套用同一個180°翻轉後機身變成往
// -z 延伸（實測機身世界座標 z 落在 0 ~ -0.34，不是置中在 0）。偏移量是
// 機身深度(0.34m)的一半，讓機身重新置中在 z=0——這個「置中在0」的基準
// 是 TV_POSITION.z 算式本來就假設好的，兩邊要對得上。
export const DVD_PLAYER_POSITION: [number, number, number] = [0, 0, 0.17]

// 選片後選中的碟片要飛向的世界座標——大概對準 tray 打開時、靠近鏡頭那端
// 的位置（tray 本地座標約 (0, 0.039, -0.132)，套用 DVD_PLAYER_POSITION/
// 180°翻轉換算成世界座標約 (0, 0.039, 0.302)，這裡取整、留一點餘裕，
// 實際數字有再對照瀏覽器畫面微調）。碟片不用真的精確卡進 tray 凹槽，
// 飛到這附近同時配合縮小、tray 關起來遮住，視覺上就夠說服人了。
export const DVD_TRAY_INSERT_POSITION: [number, number, number] = [0, 0.045, 0.28]

// DVD 盒改成平放在 TV 頂面上，隨性斜放（不再是站著靠在 TV 側邊那套姿態，
// 那套「底部支點、傾角算物理」的設計已經拿掉）。TV 頂面世界座標 y =
// DVD_PLAYER_HEIGHT + TV_HEIGHT；再加半個盒子厚度，盒子才是「躺在」
// 頂面上，不是嵌進去。x/z 偏一點、不要正中央，看起來才像隨手放的。
export const DVD_CASE_REST_POSITION: [number, number, number] = [
  0.05,
  DVD_PLAYER_HEIGHT + TV_HEIGHT + DVD_CASE_DEPTH / 2,
  0.08,
]
// 換成 Blender 匯出的真實 case 後不用再轉 -90°——這條是舊 placeholder box
// 專用的（那個 box 用 three.js 手刻，預設厚度軸是水平的 Z，需要轉 90° 讓
// 厚度變垂直）。真實 Blender 模型的厚度軸（Blender Z）匯出後直接對應
// three.js 的 Y 軸，本來就是垂直的，不用轉。剩下這個 0.4 弧度是繞 Y
// （垂直軸）的隨性擺放角度，角度憑感覺抓，看畫面調。
export const DVD_CASE_REST_ROTATION: [number, number, number] = [0, 0.4, 0]

export const CAMERA_POSITION: [number, number, number] = [0.55, 0.75, 1.9]
export const CAMERA_TARGET: [number, number, number] = [0, 0.25, 0]
export const CAMERA_FOV = 45

export const ORBIT_MIN_DISTANCE = 0.6
export const ORBIT_MAX_DISTANCE = 3.5
