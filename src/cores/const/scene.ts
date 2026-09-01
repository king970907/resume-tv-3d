// 1 unit = 1 公尺。真實世界參考尺寸（公分）× 1.2（展示尺度加成）換算來的。
// 之後要整組縮放的話保持這個比例——見 CLAUDE.md。

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

export const DVD_CASE_WIDTH = 0.02
export const DVD_CASE_HEIGHT = 0.16
export const DVD_CASE_DEPTH = 0.23

export const DVD_DIAMETER = 0.144
export const DVD_THICKNESS = 0.0014

// TV 疊在 player 頂面上；player 貼地（y = 0）。
export const TV_POSITION: [number, number, number] = [0, DVD_PLAYER_HEIGHT, 0]
export const DVD_PLAYER_POSITION: [number, number, number] = [0, 0, 0]

// DVD 盒站著、斜靠在 TV 右側，底部貼在 TV 站的同一個面上。這裡的支點是盒子
// 的「底部邊緣」，不是幾何中心——繞底部轉，頂部才會往 TV 那邊倒，不會整顆
// 甩進 TV 裡。姿態是憑感覺抓的，看過算圖再微調。
export const DVD_CASE_BASE_POSITION: [number, number, number] = [
  0.33,
  DVD_PLAYER_HEIGHT,
  0.02,
]
export const DVD_CASE_LEAN_ANGLE = 0.3 // 弧度，繞 Z 軸傾斜——正值讓頂部往 -X 方向倒（往 TV 那邊）

export const CAMERA_POSITION: [number, number, number] = [0.55, 0.75, 1.9]
export const CAMERA_TARGET: [number, number, number] = [0, 0.25, 0]
export const CAMERA_FOV = 45

export const ORBIT_MIN_DISTANCE = 0.6
export const ORBIT_MAX_DISTANCE = 3.5
