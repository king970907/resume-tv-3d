import { Vector3 } from 'three'

// 場景所有鏡頭姿態（預設遠景、螢幕聚焦、全螢幕運鏡）都是照桌機的寬螢幕
// 比例（開發時用的視窗大概 4:3~16:9 之間）調的構圖。手機直式螢幕又窄又
// 高，同一組鏡頭位置/目標點原封不動放到手機上，主體會直接跑出視野外
// （實測過：不調整的話，直式手機螢幕下 TV 整台完全看不到，只剩開場
// 文字）。
//
// 修法不是加大視角(FOV)去補償變窄的水平視野——算過要補到 100°+ 的魚眼
// 程度才夠，畫面反而更難看、也跟另外為了「正面構圖不失真」特地調小 FOV
// 的用意衝突。改成沿著「鏡頭→目標」同一條視線方向把鏡頭往後拉，主體的
// 視角/透視效果完全不變，只是在窄螢幕上縮小、留出更多邊界，是使用者
// 建議的方向（調整物件大小）。
const REFERENCE_ASPECT = 4 / 3
// 拉遠倍數設上限，避免極端的視窗尺寸（例如桌機瀏覽器被手動拉成一條細長
// 條）把主體拉到小到看不清楚——真實手機直式比例（iPhone 系列大約
// 0.46~0.5）換算出來的倍數落在 2.7~2.9，這個上限留了一些餘裕，不會在
// 正常裝置上被打到。
const MAX_PULLBACK_SCALE = 4

// 傳入設計時（桌機比例）用的鏡頭位置/目標點跟「目前實際的」寬高比，回傳
// 調整過、在窄螢幕上會自動拉遠一點的鏡頭位置。目標點（鏡頭看向哪裡）
// 不用跟著改，拉遠只改變鏡頭離目標點的距離，不改變看向的方向。
export function getResponsiveCameraPosition(
  position: [number, number, number],
  target: [number, number, number],
  aspect: number,
): Vector3 {
  const positionVec = new Vector3(...position)
  if (aspect >= REFERENCE_ASPECT) return positionVec

  const scale = Math.min(MAX_PULLBACK_SCALE, REFERENCE_ASPECT / aspect)
  const targetVec = new Vector3(...target)
  return targetVec.clone().add(positionVec.sub(targetVec).multiplyScalar(scale))
}
