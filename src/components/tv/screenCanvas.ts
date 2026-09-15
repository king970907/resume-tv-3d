// TV 螢幕貼圖的純繪圖函式——只負責在 2D canvas context 上畫東西，不碰
// three.js/React。CanvasTexture 需要的是「畫完之後 texture.needsUpdate =
// true」，呼叫端（RetroTV.tsx）負責建立 canvas/texture 跟排程重繪的時機
// （例如雜訊要用 useFrame 節流重畫，內容頁只需要換頁時畫一次）。
import type { ScreenPage } from '@/data/screenPages'

// 螢幕實體尺寸（TV_Screen_Glass 的世界座標寬高，見 blender-project/models/
// tv/notes.md 量出來的 0.329 x 0.294624m）——貼圖解析度照同一個比例抓，
// 內容才不會被拉伸變形。
export const SCREEN_CANVAS_WIDTH = 512
export const SCREEN_CANVAS_HEIGHT = Math.round(SCREEN_CANVAS_WIDTH * (0.294624 / 0.329))

// 螢幕關閉（開場文字階段用）——純黑，不用畫任何東西，呼叫端直接用一個
// 純黑材質或把 canvas 整個清成黑色即可，這裡提供函式是為了跟其他繪圖
// 函式介面一致，方便呼叫端統一處理。
export function drawOff(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, SCREEN_CANVAS_WIDTH, SCREEN_CANVAS_HEIGHT)
}

// 雜訊/換台效果——每次呼叫畫一張新的隨機黑白噪點，呼叫端用 useFrame 節流
// （不用每幀都畫，肉眼看起來像雜訊不需要真的 60fps 全隨機，太頻繁只是
// 浪費效能）反覆呼叫做出「電視訊號沒對準」的感覺。
export function drawNoise(ctx: CanvasRenderingContext2D): void {
  const w = SCREEN_CANVAS_WIDTH
  const h = SCREEN_CANVAS_HEIGHT
  const imageData = ctx.createImageData(w, h)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    // 灰階雜訊，帶一點點隨機亮度差——全彩雜訊反而不像老電視的黑白雪花。
    const v = Math.random() * 255
    data[i] = v
    data[i + 1] = v
    data[i + 2] = v
    data[i + 3] = 255
  }
  ctx.putImageData(imageData, 0, 0)

  // 疊幾條隨機水平掃描線，加強「訊號干擾」的感覺，純雜訊點陣容易看起來
  // 像普通雜訊圖片而不是電視雪花。
  ctx.globalAlpha = 0.25
  ctx.fillStyle = '#000000'
  const lineCount = 3 + Math.floor(Math.random() * 4)
  for (let i = 0; i < lineCount; i++) {
    const y = Math.random() * h
    const lineH = 1 + Math.random() * 3
    ctx.fillRect(0, y, w, lineH)
  }
  ctx.globalAlpha = 1
}

// 內容頁——純色塊背景 + 置中標題/副標，先當佔位畫面用。之後要接真的作品
// 內容（截圖、排版）時，換掉這個函式內部畫法就好，呼叫端的介面不用改。
export function drawPage(ctx: CanvasRenderingContext2D, page: ScreenPage, pageNumber: number, pageCount: number): void {
  const w = SCREEN_CANVAS_WIDTH
  const h = SCREEN_CANVAS_HEIGHT

  // 背景用深色而不是強調色本身——強調色拿來當文字/裝飾線用，整片塗滿
  // 高飽和度顏色在螢幕上會太刺眼，也不像真的介面。
  ctx.fillStyle = '#0c0f0c'
  ctx.fillRect(0, 0, w, h)

  // 掃描線紋理——固定的水平細線疊加，讓畫面有復古 CRT 的質感，不是現代
  // 平面螢幕那種乾淨無瑕的樣子。
  ctx.globalAlpha = 0.06
  ctx.fillStyle = '#ffffff'
  for (let y = 0; y < h; y += 3) {
    ctx.fillRect(0, y, w, 1)
  }
  ctx.globalAlpha = 1

  // 頂部/底部各一條強調色細線，當作簡單的「介面邊框」。
  ctx.fillStyle = page.accentColor
  ctx.fillRect(0, 0, w, 4)
  ctx.fillRect(0, h - 4, w, 4)

  // 右上角「頁碼／總頁數」，模擬電視頻道顯示。
  ctx.font = `${Math.round(h * 0.05)}px "Courier New", monospace`
  ctx.fillStyle = page.accentColor
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'
  ctx.fillText(`CH ${pageNumber}/${pageCount}`, w - 16, 16)

  // 置中標題。
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `bold ${Math.round(h * 0.11)}px "Courier New", monospace`
  ctx.fillStyle = '#f2f2ea'
  ctx.fillText(page.title, w / 2, h / 2 - h * 0.04)

  // 副標。
  ctx.font = `${Math.round(h * 0.045)}px "Courier New", monospace`
  ctx.fillStyle = page.accentColor
  wrapText(ctx, page.subtitle, w / 2, h / 2 + h * 0.09, w * 0.78, h * 0.06)
}

// 簡單的自動換行——canvas 的 fillText 不會自動換行，副標文字長度不固定，
// 沒有這個的話太長的字會直接超出螢幕寬度。
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): void {
  const words = text.split(' ')
  let line = ''
  let lineY = y
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, lineY)
      line = word
      lineY += lineHeight
    } else {
      line = testLine
    }
  }
  if (line) ctx.fillText(line, x, lineY)
}
