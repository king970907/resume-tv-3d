// 1 unit = 1 公尺。真實世界參考尺寸（公分）× 1.2（展示尺度加成）換算來的。
// 之後要整組縮放的話保持這個比例——見 CLAUDE.md。

import { DVD_TRAY_OPEN_DISTANCE } from './interaction'

export const TV_WIDTH = 0.54
export const TV_HEIGHT = 0.48
export const TV_DEPTH = 0.54

export const DVD_PLAYER_WIDTH = 0.8
export const DVD_PLAYER_HEIGHT = 0.06
export const DVD_PLAYER_DEPTH = 0.54

// 前緣凸起，跨整個前臉——真實的 AV 設備機殼不是均勻一塊板子，前面板通常會
// 比扁平的頂面稍微凸出一點。疊在主體上面，跟主體的前面切齊。
export const DVD_PLAYER_LIP_HEIGHT = 0.025
export const DVD_PLAYER_LIP_DEPTH = 0.05

// 改回真實 DVD 盒比例（寬 x 高的正面朝鏡頭，深度是最薄的那個軸）——寬深
// 之前被手動對調過，導致盒子太窄、碟片正面朝鏡頭時完全塞不進去，只能側面
// 朝向，但側面朝向在目前的鏡頭角度下幾乎看不到圓面（驗證過，不是角度問題）。
export const DVD_CASE_WIDTH = 0.23
export const DVD_CASE_HEIGHT = 0.16
export const DVD_CASE_DEPTH = 0.02

export const DVD_DIAMETER = 0.144
export const DVD_THICKNESS = 0.0014

// TV 疊在 player 頂面上；player 貼地（y = 0）。
export const TV_POSITION: [number, number, number] = [0, DVD_PLAYER_HEIGHT, 0]
export const DVD_PLAYER_POSITION: [number, number, number] = [0, 0, 0]

// Tray pivot 收/開時的局部座標，抽成常數而不是留在 DVDPlayer.tsx 內部——
// 「選片後碟片飛進 tray」這個流程需要 DVDSelector/Experience 知道 tray
// 打開時到底停在哪個世界座標，直接 import 這裡算好的，不用重新猜測或
// 跨元件伸手進 DVDPlayer 內部拿 ref。
export const DVD_PLAYER_TRAY_X = 0.15
export const DVD_PLAYER_TRAY_Y = DVD_PLAYER_HEIGHT * 0.3
export const DVD_PLAYER_TRAY_CLOSED_Z = DVD_PLAYER_DEPTH / 3.5
export const DVD_PLAYER_TRAY_OPEN_Z = DVD_PLAYER_TRAY_CLOSED_Z + DVD_TRAY_OPEN_DISTANCE

// Tray 完全打開時的世界座標——用加法算而不是寫死，之後 DVD_PLAYER_POSITION
// 如果改了（例如 player 挪位置），這裡不用跟著手動改。
export const DVD_PLAYER_TRAY_OPEN_POSITION: [number, number, number] = [
  DVD_PLAYER_POSITION[0] + DVD_PLAYER_TRAY_X,
  DVD_PLAYER_POSITION[1] + DVD_PLAYER_TRAY_Y,
  DVD_PLAYER_POSITION[2] + DVD_PLAYER_TRAY_OPEN_Z,
]

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
