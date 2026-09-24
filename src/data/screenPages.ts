import type { Project } from '@/cores/types/project'
import { PROJECTS } from './projects'
import resumePagesData from './resumePages.json'

// TV 螢幕要顯示的「頁面」資料——先用簡單佔位內容（純色塊+標題+副標），
// 之後真正要接履歷內容時只要換這個陣列，畫面/貼圖邏輯不用動。頻道旋鈕
// 每按一次就切到下一筆，繞回開頭。
//
// 跟 DVDSelector 的 PROJECTS（src/data/projects.ts）是分開的兩組資料——
// 履歷是「一開始就看得到、頻道旋鈕轉台」的內容，作品集是「先插片、按下
// 播放鍵才會顯示、音量旋鈕切換」的內容，語意分屬網站的兩個身份（履歷 vs
// 作品集），資料也不共用同一份陣列。但兩者共用同一個 ScreenPage 形狀，
// 選中的 Project 會透過 projectToScreenPage() 轉成一個臨時的 ScreenPage
// 顯示，不需要另外準備一套畫面邏輯。

export interface ScreenPage {
  id: string
  // 螢幕右上角的小標籤——履歷頁用 "RESUME 1/3" 這種格式，播放中的作品
  // 用 "PROJECT 1/3"，讓使用者分得出現在螢幕上是履歷還是作品集，也知道
  // 目前是第幾筆、共幾筆。
  badge: string
  // 螢幕上顯示的大標題，全大寫比較有復古電視字幕的感覺。
  title: string
  subtitle: string
  // 背景/強調色——canvas 貼圖跟全螢幕 DOM 疊層共用同一份資料，兩邊都讀
  // 這個顏色，畫面才會一致。
  accentColor: string
}

// 履歷頁佔位內容——注意 badge 是這裡就先算好的固定字串，不是畫圖時才
// 動態組字串，跟作品集播放頁的 badge 一樣都是「資料自己知道要顯示什麼
// 標籤」，drawPage() 不用另外傳 pageNumber/pageCount 進去組字串。內容
// 放在 resumePages.json（跟程式碼分開，方便直接編輯/置換）。
const RESUME_PLACEHOLDER_PAGES: Omit<ScreenPage, 'badge'>[] = resumePagesData

export const RESUME_PAGES: ScreenPage[] = RESUME_PLACEHOLDER_PAGES.map((page, i) => ({
  ...page,
  badge: `RESUME ${i + 1}/${RESUME_PLACEHOLDER_PAGES.length}`,
}))

// 作品集播放頁用的強調色——跟 RESUME_PAGES 分開一組調色盤，PROJECTS
// 數量不固定（目前3筆），用取餘數的方式循環套色，不用跟頁數綁死。
const PROJECT_ACCENT_COLORS = ['#39ff14', '#5aa9e6', '#ffb066', '#e05a5a', '#c77dff']

// 把選中的 Project 轉成螢幕要畫的 ScreenPage——按下 player 播放鍵之後、
// 音量旋鈕切台專用，跟履歷頻道旋鈕的 RESUME_PAGES 是平行的兩條內容來源，
// 共用同一個型別/同一套 canvas 繪圖邏輯（screenCanvas.ts 的 drawPage
// 只認 ScreenPage，不管這個 page 究竟是履歷轉台轉出來的還是作品集播出
// 來的）。badge 用動態算的頁碼（不是寫死的 'DVD'）——音量旋鈕現在真的
// 可以在 PROJECTS 之間切換，需要跟履歷側一樣的「第幾筆/共幾筆」提示。
export function projectToScreenPage(project: Project, index: number): ScreenPage {
  return {
    id: project.id,
    badge: `PROJECT ${index + 1}/${PROJECTS.length}`,
    title: project.title.toUpperCase(),
    subtitle: project.description,
    accentColor: PROJECT_ACCENT_COLORS[index % PROJECT_ACCENT_COLORS.length],
  }
}
