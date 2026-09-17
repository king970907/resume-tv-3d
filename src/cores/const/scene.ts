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

// 選片後選中的碟片要飛向的世界座標——瀏覽器直接量 DVD_Tray_Base（碟片
// 實際會躺的那塊平台）的世界座標邊界框量出來的：X 落在 [-0.124, 0.124]、
// Y 落在 [0.039, 0.044]（頂面）。原本這裡用「tray 前端」的 z≈0.28 當目標，
// 太靠近平台最前緣（max=0.302），畫面上看起來像碟片卡在托盤前端快掉出來，
// 不是躺在托盤中間——改成用平台中心的 z，Y 維持在頂面高度，才是碟片真正
// 該躺的地方。
//
// z 值會跟著 DVD_TRAY_OPEN_DISTANCE 一起變動——這是「tray 開啟時平台的
// 世界座標中心」，不是機身上固定不動的點，tray 滑出的距離改變，平台中心
// 的世界座標也會跟著平移，兩個常數要一起改、對得上。DVD_TRAY_OPEN_
// DISTANCE 從 0.14 調到 0.2（見 interaction.ts 的說明）之後，平台 Z 落在
// [0.142, 0.362]，置中點是 (0, 0.0415, 0.252)，這裡的 z 也要跟著從 0.19
// 改成 0.252，不然碟片會飛到「舊的、還沒滑那麼出去的」位置，落在平台
// 偏後（靠鉸鏈那一側）的地方，跟現在滑出更多的托盤前緣對不齊。
export const DVD_TRAY_INSERT_POSITION: [number, number, number] = [0, 0.044, 0.252]

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

// 盒子裡那片可以點擊、放進 player 的光碟——靜置姿態直接用瀏覽器
// getWorldPosition()/getWorldQuaternion() 量出來的世界座標數字（不是手算
// DVD_CASE_REST_POSITION/ROTATION 疊 DVDCase.tsx 內部兩層置中/裝配偏移
// 反推的——那樣疊多層 transform 手算容易算錯，直接量最後結果最可靠）。
// 量出來的世界四元數換算成 <DVD rotation={...}> 這個 prop 要填的 euler
// 之後，剛好等於 DVD_CASE_REST_ROTATION 本身（因為 DVDCase.tsx 內部
// 那兩層 group 只有 DVD_CASE_REST_ROTATION 這一個旋轉來源，置中用的那層
// 只有位移沒有旋轉，DVD.tsx 自己內部固定的 180° 翻面在換算時已經抵消
// 掉了）——這裡沒有直接重用 DVD_CASE_REST_ROTATION 這個名字，是因為兩者
// 語意不同（一個是盒子本身的擺放角度，一個是光碟的靜置姿態），數字相同
// 純屬這個場景的巧合，之後任一邊改了都不能假設另一邊會跟著對。
export const DVD_CASE_DISC_REST_POSITION: [number, number, number] = [0.05, 0.4942, 0.08]
export const DVD_CASE_DISC_REST_ROTATION: [number, number, number] = [0, 0.4, 0]

// 光碟從盒子飛進 player 的路上，要先繞到 tray 正上方、同時維持在 TV 頂面
// 以上的高度，再垂直降下——如果直接從盒子（在 TV 頂上，y≈0.494）走直線
// 飛到 tray（在 TV 前方貼地處，y≈0.084、z 也差很多），中間那段直線會
// 直接穿過 TV 機身（使用者實測回報「移動過程中會穿過 TV」）。改成先飛到
// 這個「tray 正上方、y 還維持在 TV 頂面以上」的中繼點，水平位置對齊之後
// 才整段垂直降下，路徑就會是「拿起來、越過電視上方、放下」，任何一段都
// 不會跟 TV 機身的體積重疊。
//
// y=0.55：TV 頂面世界座標是 DVD_PLAYER_HEIGHT+TV_HEIGHT≈0.488，光碟原本
// 靜置在盒子裡就已經比這個高一點（0.4942，盒子本身的厚度墊出來的），這裡
// 再往上留約 6cm 的安全邊界，蓋過機身頂面任何細節凸起（旋鈕面板、LED
// 燈殼等），不用算得剛剛好卡在頂面。x/z 直接用 tray 插槽的座標，這個
// 中繼點的用途只有「維持高度、水平對齊」，不需要额外的水平偏移。
export const DVD_INSERT_CLEAR_POSITION: [number, number, number] = [
  DVD_TRAY_INSERT_POSITION[0],
  0.55,
  DVD_TRAY_INSERT_POSITION[2],
]

export const CAMERA_POSITION: [number, number, number] = [0.55, 0.75, 1.9]
export const CAMERA_TARGET: [number, number, number] = [0, 0.25, 0]
export const CAMERA_FOV = 45

// 開盒後的「盒子特寫」鏡頭姿態——跟 screen.ts 的 CAMERA_FOCUS_* 同一種
// 「縮小 FOV + 拉遠對應距離」長焦式構圖手法（近距離用標準 FOV 拍會有
// 明顯廣角透視變形），瀏覽器實測調出由上往下看整個開啟盒子的構圖，光碟
// 清楚置中、盒蓋跟 DVD player 一角露出來給畫面一點空間脈絡。
export const CAMERA_CASE_POSITION: [number, number, number] = [0.05, 1.15, 0.32]
export const CAMERA_CASE_TARGET: [number, number, number] = [0.05, 0.4942, 0.08]
export const CAMERA_CASE_FOV = 30

export const ORBIT_MIN_DISTANCE = 0.6
export const ORBIT_MAX_DISTANCE = 3.5
