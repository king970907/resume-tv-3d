// TV 螢幕貼圖的純繪圖函式——只負責在 2D canvas context 上畫東西，不碰
// three.js/React。CanvasTexture 需要的是「畫完之後 texture.needsUpdate =
// true」，呼叫端（RetroTV.tsx）負責建立 canvas/texture 跟排程重繪的時機
// （例如雜訊要用 useFrame 節流重畫，內容頁只需要換頁時畫一次）。
import { RESUME_PAGES } from '@/data/screenPages'
import type { ScreenPage } from '@/data/screenPages'
import { RESUME_INTRO, RESUME_JOBS, RESUME_SKILLS } from '@/data/resumeContent'
import { PROJECTS } from '@/data/projects'

// 螢幕實體尺寸（TV_Screen_Glass 的世界座標寬高，見 blender-project/models/
// tv/notes.md 量出來的 0.329 x 0.294624m）——貼圖解析度照同一個比例抓，
// 內容才不會被拉伸變形。
export const SCREEN_CANVAS_WIDTH = 512
export const SCREEN_CANVAS_HEIGHT = Math.round(SCREEN_CANVAS_WIDTH * (0.294624 / 0.329))

// 履歷頁在小螢幕上用的 SOUL 圖示——跟全螢幕疊層（TerminalFrame/Resume*Page）
// 用的是同一組使用者提供的素材，這裡另外 new Image() 預先載入一份，是因為
// canvas 2D 的 drawImage 沒辦法像 <img> 那樣等瀏覽器自動處理載入時機，得
// 自己追蹤「圖片載到好了沒」。字型也一樣——canvas 文字不會像 DOM 那樣在
// webfont 載入完成後自動重排，畫的當下字型還沒 ready 就會永久烙印成
// fallback 字型，所以連同 document.fonts.load() 一起包進 screenAssetsReady，
// 讓呼叫端（RetroTV.tsx）在真正的字型/圖片都緒後可以再補畫一次。
const soulRedImage = new Image()
soulRedImage.src = '/sprites/soul-red.png'
const soulBlueImage = new Image()
soulBlueImage.src = '/sprites/soul-blue.png'

function whenImageReady(img: HTMLImageElement): Promise<void> {
  if (img.complete) return Promise.resolve()
  return new Promise((resolve) => {
    img.addEventListener('load', () => resolve(), { once: true })
    img.addEventListener('error', () => resolve(), { once: true })
  })
}

export const screenAssetsReady: Promise<void> = Promise.all([
  document.fonts.load('16px "Pixelify Sans"'),
  document.fonts.load('16px "VT323"'),
  // Unifont-T——中文 fallback 字型，理由跟 global.css 裡 --font-pixel/
  // --font-retro 加這個 fallback 是同一個（Pixelify Sans/VT323 都不含
  // 中文字符），小螢幕上的中文提示文字（「點擊螢幕查看...」）要靠它才
  // 不會落回瀏覽器預設字體。
  document.fonts.load('16px "Unifont-T"'),
  whenImageReady(soulRedImage),
  whenImageReady(soulBlueImage),
]).then(() => undefined)

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

// TV_Screen_Glass 的 UV 是拿整個幾何的邊界框線性映射出來的（見
// RetroTV.tsx），這個邊界框包含了螢幕四周會往內凹的圓角/斜切玻璃邊緣，
// 不是只有中央那塊平坦可視區——貼圖如果畫滿整個 512x460，文字/裝飾線
// 會被安排到那圈邊緣，實際呈現時看起來像「超出螢幕」（使用者截圖裡
// 頂部強調線、副標文字都頂到邊緣就是這樣）。所有內容改成畫在留了安全
// 邊界的內縮區域，不要用整個 canvas 尺寸。
const SAFE_MARGIN_RATIO = 0.09

// 履歷頁（resume-1/2/3）的 id 對應第幾頁（0-based）——跟全螢幕疊層那邊
// FullscreenOverlay 用 MainScene 傳下來的 resumePageIndex 判斷是同一件事，
// 這裡因為 drawPage() 只收得到 ScreenPage 本身，改用 id 反推，不用讓
// RetroTV/Experience 這條路徑額外多穿一個 prop——page.id 本來就是資料
// 自己決定的固定字串（見 screenPages.ts），不會變。
function resumePageIndexFromId(id: string): number | null {
  const match = /^resume-(\d)$/.exec(id)
  if (!match) return null
  return Number(match[1]) - 1
}

// 作品頁（project-1/2/3）的 id 對應第幾頁（0-based）——理由跟
// resumePageIndexFromId 一樣，見上面的說明。
function projectPageIndexFromId(id: string): number | null {
  const match = /^project-(\d)$/.exec(id)
  if (!match) return null
  return Number(match[1]) - 1
}

// 缺角矩形路徑——履歷頁 Undertale 風格對話框的邊框形狀，跟全螢幕疊層
// （TerminalFrame.module.css）用 CSS clip-path 疊兩層做的是同一個形狀，
// 這裡在 canvas 2D 用路徑點手畫，兩邊維持同一套視覺語言。
function pathNotchedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, notch: number): void {
  ctx.beginPath()
  ctx.moveTo(x + notch, y)
  ctx.lineTo(x + w - notch, y)
  ctx.lineTo(x + w, y + notch)
  ctx.lineTo(x + w, y + h - notch)
  ctx.lineTo(x + w - notch, y + h)
  ctx.lineTo(x + notch, y + h)
  ctx.lineTo(x, y + h - notch)
  ctx.lineTo(x, y + notch)
  ctx.closePath()
}

// 履歷/作品頁共用的外殼——頂部系統列（SYS://...EXE + Blue SOUL 頻道徽章）
// + 缺角對話框，跟全螢幕疊層的 TerminalFrame 是同一套視覺（systemLabel/
// channelLabel 兩個參數對應 TerminalFrame 的同名 prop），只是縮到小螢幕
// 的解析度。回傳缺角對話框內部可用的內容區域，讓各頁畫自己的內容。
function drawTerminalChrome(
  ctx: CanvasRenderingContext2D,
  systemLabel: string,
  channelLabel: string,
  channel: number,
  channelCount: number,
): { x: number; y: number; w: number; h: number } {
  const w = SCREEN_CANVAS_WIDTH
  const h = SCREEN_CANVAS_HEIGHT
  const marginX = w * SAFE_MARGIN_RATIO
  const marginY = h * SAFE_MARGIN_RATIO

  ctx.fillStyle = '#050505'
  ctx.fillRect(0, 0, w, h)

  // 掃描線——跟原本的做法一樣，鋪滿全螢幕。
  ctx.globalAlpha = 0.06
  ctx.fillStyle = '#ffffff'
  for (let y = 0; y < h; y += 3) {
    ctx.fillRect(0, y, w, 1)
  }
  ctx.globalAlpha = 1

  // 頂部系統列。
  const systemY = marginY
  ctx.font = '11px "VT323", "Unifont-T", monospace'
  ctx.fillStyle = '#6f7266'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(systemLabel, marginX, systemY)

  const badgeText = `${channelLabel} ${String(channel).padStart(2, '0')}/${String(channelCount).padStart(2, '0')}`
  ctx.font = '11px "Pixelify Sans", "Unifont-T", monospace'
  ctx.textAlign = 'right'
  ctx.fillStyle = '#eef0e6'
  const badgeWidth = ctx.measureText(badgeText).width
  const soulSize = 12
  const soulGap = 6
  const badgeRight = w - marginX
  ctx.fillText(badgeText, badgeRight, systemY)
  if (soulBlueImage.complete) {
    ctx.drawImage(soulBlueImage, badgeRight - badgeWidth - soulGap - soulSize, systemY - 1, soulSize, soulSize)
  }

  // 缺角對話框——雙層 path 疊出白色缺角框 + 黑色內層，跟 CSS 那邊兩層
  // clip-path 是同一個做法。
  const boxTop = systemY + 22
  const boxX = marginX
  const boxY = boxTop
  const boxW = w - marginX * 2
  const boxH = h - marginY - boxTop
  ctx.fillStyle = '#eef0e6'
  pathNotchedRect(ctx, boxX, boxY, boxW, boxH, 10)
  ctx.fill()
  const borderT = 4
  ctx.fillStyle = '#050505'
  pathNotchedRect(ctx, boxX + borderT, boxY + borderT, boxW - borderT * 2, boxH - borderT * 2, 8)
  ctx.fill()

  const pad = 16
  return { x: boxX + borderT + pad, y: boxY + borderT + pad, w: boxW - borderT * 2 - pad * 2, h: boxH - borderT * 2 - pad * 2 }
}

// CH 01——個人簡介，縮到小螢幕的濃縮版：只留姓名/職稱，長篇自介留給
// 全螢幕頁（點螢幕看），這裡放不下也不需要放，小螢幕的作用是「頻道
// 預覽」不是「完整內容」。
function drawResumeIntro(ctx: CanvasRenderingContext2D, area: { x: number; y: number; w: number; h: number }): void {
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  ctx.font = '13px "VT323", "Unifont-T", monospace'
  ctx.fillStyle = '#9a9d90'
  ctx.fillText('> whoami', area.x, area.y + 14)

  const soulSize = 18
  if (soulRedImage.complete) {
    ctx.drawImage(soulRedImage, area.x, area.y + 30, soulSize, soulSize)
  }
  ctx.font = 'bold 24px "Pixelify Sans", "Unifont-T", monospace'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(RESUME_INTRO.name, area.x + soulSize + 10, area.y + 46)

  ctx.font = '13px "VT323", "Unifont-T", monospace'
  ctx.fillStyle = '#9a9d90'
  ctx.fillText('> role --print', area.x, area.y + 78)
  ctx.font = '12px "Pixelify Sans", "Unifont-T", monospace'
  ctx.fillStyle = '#eef0e6'
  ctx.fillText(RESUME_INTRO.role, area.x + 20, area.y + 100)

  ctx.font = '12px "VT323", "Unifont-T", monospace'
  ctx.fillStyle = '#6f7266'
  ctx.fillText('▼ 點擊螢幕查看完整簡介', area.x, area.y + area.h - 6)
}

// CH 02——技能，濃縮成分類名稱清單（不逐項畫技能等級條，那個留給全螢幕
// 頁——512x458 這個解析度塞得下標題，塞不下一長串分段像素條還要保持
// 看得清楚）。
function drawResumeSkills(ctx: CanvasRenderingContext2D, area: { x: number; y: number; w: number; h: number }): void {
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  ctx.font = '13px "VT323", "Unifont-T", monospace'
  ctx.fillStyle = '#9a9d90'
  ctx.fillText('> cat skills.txt', area.x, area.y + 14)

  const soulSize = 14
  const rowStart = area.y + 42
  const rowGap = 32
  RESUME_SKILLS.forEach((category, i) => {
    const rowY = rowStart + i * rowGap
    if (soulRedImage.complete) {
      ctx.drawImage(soulRedImage, area.x, rowY - soulSize + 4, soulSize, soulSize)
    }
    ctx.font = '15px "Pixelify Sans", "Unifont-T", monospace'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(category.name, area.x + soulSize + 10, rowY)
  })

  ctx.font = '12px "VT323", "Unifont-T", monospace'
  ctx.fillStyle = '#6f7266'
  ctx.fillText('▼ 點擊螢幕查看完整技能列表', area.x, area.y + area.h - 6)
}

// CH 03——工作經歷，濃縮成職稱/公司清單（不逐條畫描述文字，理由同上）。
function drawResumeExperience(ctx: CanvasRenderingContext2D, area: { x: number; y: number; w: number; h: number }): void {
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  ctx.font = '13px "VT323", "Unifont-T", monospace'
  ctx.fillStyle = '#9a9d90'
  ctx.fillText('> ls -la experience/', area.x, area.y + 14)

  const soulSize = 14
  const rowStart = area.y + 42
  const rowGap = 40
  RESUME_JOBS.forEach((job, i) => {
    const rowY = rowStart + i * rowGap
    if (soulRedImage.complete) {
      ctx.drawImage(soulRedImage, area.x, rowY - soulSize + 4, soulSize, soulSize)
    }
    ctx.font = '13px "Pixelify Sans", "Unifont-T", monospace'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(`${job.role} @ ${job.company}`, area.x + soulSize + 10, rowY)
    ctx.font = '11px "VT323", "Unifont-T", monospace'
    ctx.fillStyle = '#9a9d90'
    ctx.fillText(job.dates, area.x + soulSize + 10, rowY + 15)
  })

  ctx.font = '12px "VT323", "Unifont-T", monospace'
  ctx.fillStyle = '#6f7266'
  ctx.fillText('▼ 點擊螢幕查看完整經歷', area.x, area.y + area.h - 6)
}

// 畫一顆技術標籤（像素邊框小方塊），回傳畫完之後往右要留的寬度，讓呼叫端
// 排下一顆標籤的 x 座標——跟全螢幕版 ProjectPage.module.css 的 .tag 是
// 同一個視覺，這裡用 strokeRect 手畫邊框。
function drawTechTag(ctx: CanvasRenderingContext2D, x: number, y: number, text: string): number {
  ctx.font = '10px "Pixelify Sans", "Unifont-T", monospace'
  const textWidth = ctx.measureText(text).width
  const padX = 8
  const tagH = 18
  const tagW = textWidth + padX * 2
  ctx.strokeStyle = '#eef0e6'
  ctx.lineWidth = 2
  ctx.strokeRect(x, y, tagW, tagH)
  ctx.fillStyle = '#eef0e6'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x + padX, y + tagH / 2 + 1)
  return tagW
}

// DVD 0X——作品頁，縮到小螢幕的濃縮版：標題 + 技術標籤，不放縮圖/完整
// 簡介（那個留給全螢幕頁），理由跟履歷頁的三個 drawResume* 函式一樣，
// 小螢幕的作用是「頻道預覽」不是「完整內容」。
function drawProjectMini(ctx: CanvasRenderingContext2D, area: { x: number; y: number; w: number; h: number }, project: (typeof PROJECTS)[number]): void {
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  ctx.font = '13px "VT323", "Unifont-T", monospace'
  ctx.fillStyle = '#9a9d90'
  ctx.fillText('> cat project.txt', area.x, area.y + 14)

  const soulSize = 18
  if (soulRedImage.complete) {
    ctx.drawImage(soulRedImage, area.x, area.y + 30, soulSize, soulSize)
  }
  ctx.font = 'bold 22px "Pixelify Sans", "Unifont-T", monospace'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(project.title.toUpperCase(), area.x + soulSize + 10, area.y + 46)

  // 技術標籤——超出安全區寬度就換行，避免標籤數量一多直接畫出螢幕外。
  let tagX = area.x
  let tagY = area.y + 72
  const tagGap = 8
  const rowH = 28
  project.tech.forEach((tech) => {
    const tagW = ctx.measureText(tech.toUpperCase()).width + 16
    if (tagX + tagW > area.x + area.w) {
      tagX = area.x
      tagY += rowH
    }
    const drawnWidth = drawTechTag(ctx, tagX, tagY, tech.toUpperCase())
    tagX += drawnWidth + tagGap
  })

  ctx.textAlign = 'left'
  ctx.font = '12px "VT323", "Unifont-T", monospace'
  ctx.fillStyle = '#6f7266'
  ctx.fillText('▼ 點擊螢幕查看完整內容', area.x, area.y + area.h - 6)
}

// 內容頁——履歷三頁（resume-1/2/3）、作品三頁（project-1/2/3）都用
// Undertale 風格的缺角對話框（drawTerminalChrome），其餘頁面（目前沒有
// 其他來源，保留當防呆 fallback）維持原本「純色塊背景 + 置中標題/副標」
// 的通用版面。
export function drawPage(ctx: CanvasRenderingContext2D, page: ScreenPage): void {
  const resumeIndex = resumePageIndexFromId(page.id)
  if (resumeIndex !== null) {
    const area = drawTerminalChrome(ctx, 'SYS://RESUME.EXE', 'CH', resumeIndex + 1, RESUME_PAGES.length)
    if (resumeIndex === 0) drawResumeIntro(ctx, area)
    else if (resumeIndex === 1) drawResumeSkills(ctx, area)
    else drawResumeExperience(ctx, area)
    return
  }

  const projectIndex = projectPageIndexFromId(page.id)
  if (projectIndex !== null) {
    const area = drawTerminalChrome(ctx, 'SYS://PROJECTS.EXE', 'DVD', projectIndex + 1, PROJECTS.length)
    drawProjectMini(ctx, area, PROJECTS[projectIndex])
    return
  }

  const w = SCREEN_CANVAS_WIDTH
  const h = SCREEN_CANVAS_HEIGHT
  const marginX = w * SAFE_MARGIN_RATIO
  const marginY = h * SAFE_MARGIN_RATIO
  const safeLeft = marginX
  const safeRight = w - marginX
  const safeTop = marginY
  const safeBottom = h - marginY
  const safeWidth = safeRight - safeLeft
  const safeCenterX = w / 2

  // 背景照樣鋪滿整個 canvas（包含安全邊界外的部分）——背景色深、跟螢幕
  // 邊緣的玻璃反光融合在一起看不出破綻，只有「內容」（文字、裝飾線）
  // 才需要限制在安全區內。
  ctx.fillStyle = '#0c0f0c'
  ctx.fillRect(0, 0, w, h)

  // 掃描線紋理——固定的水平細線疊加，讓畫面有復古 CRT 的質感，不是現代
  // 平面螢幕那種乾淨無瑕的樣子。這個也鋪滿全螢幕，細線本身不構成「內容
  // 超出畫面」的問題。
  ctx.globalAlpha = 0.06
  ctx.fillStyle = '#ffffff'
  for (let y = 0; y < h; y += 3) {
    ctx.fillRect(0, y, w, 1)
  }
  ctx.globalAlpha = 1

  // 頂部/底部各一條強調色細線，當作簡單的「介面邊框」——改成畫在安全區
  // 的左右邊界之間，不是整個 canvas 寬度。
  ctx.fillStyle = page.accentColor
  ctx.fillRect(safeLeft, safeTop, safeWidth, 4)
  ctx.fillRect(safeLeft, safeBottom - 4, safeWidth, 4)

  // 右上角標籤，模擬電視頻道顯示，貼著安全區的右上角，不是 canvas 本身
  // 的右上角。
  ctx.font = `${Math.round(h * 0.05)}px "Courier New", monospace`
  ctx.fillStyle = page.accentColor
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'
  ctx.fillText(page.badge, safeRight, safeTop + 12)

  // 置中標題——用 safeWidth 當作換行寬度上限，標題本身不換行但至少
  // 保證起點/終點都在安全區內；真的太長的標題交給呼叫端控制文字長度，
  // 這裡先不做自動縮字級。
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `bold ${Math.round(h * 0.11)}px "Courier New", monospace`
  ctx.fillStyle = '#f2f2ea'
  ctx.fillText(page.title, safeCenterX, h / 2 - h * 0.04, safeWidth)

  // 副標。
  ctx.font = `${Math.round(h * 0.045)}px "Courier New", monospace`
  ctx.fillStyle = page.accentColor
  wrapText(ctx, page.subtitle, safeCenterX, h / 2 + h * 0.09, safeWidth, h * 0.06)
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
