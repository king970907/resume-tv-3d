// 1 unit = 1 公尺。真實世界參考尺寸（公分）× 1.2（展示尺度加成）換算來的。
// 之後要整組縮放的話保持這個比例——見 CLAUDE.md。

// TV_WIDTH/TV_DEPTH、DVD_PLAYER_WIDTH/DEPTH/LIP_* 這些原本是 RoundedBox
// placeholder 用的尺寸常數——TV 跟 DVD player 都換成 Blender 匯出的真實
// geometry 後，實際尺寸已經內建在 .glb 檔案裡，這些常數沒有地方在用了，
// 拿掉避免誤導（以為改這裡會影響模型大小，實際上不會）。
export const TV_HEIGHT = 0.48

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

// DVD 盒改成平放在 TV 頂面上，隨性斜放（不再是站著靠在 TV 側邊那套姿態，
// 那套「底部支點、傾角算物理」的設計已經拿掉）。TV 頂面世界座標 y =
// DVD_PLAYER_HEIGHT + TV_HEIGHT；再加半個盒子厚度，盒子才是「躺在」
// 頂面上，不是嵌進去。x/z 偏一點、不要正中央，看起來才像隨手放的。
export const DVD_CASE_REST_POSITION: [number, number, number] = [
  0.05,
  DVD_PLAYER_HEIGHT + TV_HEIGHT + DVD_CASE_DEPTH / 2,
  0.08,
]
// [x, y, z]：Euler 角是依序套用的，每一節繞的是「上一步轉完後的新軸」。
// x 先轉 -90° 把盒子從站立轉成平躺（正面朝上）——轉完之後，物件原本的
// Z 軸才是現在指向垂直方向的那個軸，所以「隨性轉一個角度」要放在 z，
// 不是 y（y 轉完之後其實是水平朝前後的軸，轉它會把盒子掀起來，插進 TV
// 裡——這是上一版插進電視裡的真正原因）。角度憑感覺抓，看畫面調。
export const DVD_CASE_REST_ROTATION: [number, number, number] = [-Math.PI / 2, 0, 0.4]

export const CAMERA_POSITION: [number, number, number] = [0.55, 0.75, 1.9]
export const CAMERA_TARGET: [number, number, number] = [0, 0.25, 0]
export const CAMERA_FOV = 45

export const ORBIT_MIN_DISTANCE = 0.6
export const ORBIT_MAX_DISTANCE = 3.5
