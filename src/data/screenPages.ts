import type { Project } from '@/cores/types/project'

// TV 螢幕要顯示的「頁面」資料——先用簡單佔位內容（純色塊+標題+副標），
// 之後真正要接作品內容時只要換這個陣列，畫面/貼圖邏輯不用動。旋鈕每按
// 一次就切到下一筆，繞回開頭。
//
// 跟 DVDSelector 的 PROJECTS（src/data/projects.ts）是分開的兩組資料——
// 旋鈕是「隨便轉台看佔位內容」，DVD 選片是「挑一個真的作品放進 player
// 播放」，語意不同，資料也不共用同一份陣列。但兩者共用同一個 ScreenPage
// 形狀，選中的 Project 會透過 projectToScreenPage() 轉成一個臨時的
// ScreenPage 顯示，不需要另外準備一套畫面邏輯。

export interface ScreenPage {
  id: string
  // 螢幕右上角的小標籤——頻道頁用 "CH 1/4" 這種格式，DVD 播放的內容用
  // "DVD" 固定字樣，讓使用者分得出「現在是轉台轉到的」還是「放的是選好
  // 的片」。
  badge: string
  // 螢幕上顯示的大標題，全大寫比較有復古電視字幕的感覺。
  title: string
  subtitle: string
  // 背景/強調色——canvas 貼圖跟全螢幕 DOM 疊層共用同一份資料，兩邊都讀
  // 這個顏色，畫面才會一致。
  accentColor: string
}

// 純轉台用的佔位內容——注意 badge 是這裡就先算好的固定字串，不是畫圖時
// 才動態組字串，跟 DVD 播放頁的 badge 一樣都是「資料自己知道要顯示什麼
// 標籤」，drawPage() 不用另外傳 pageNumber/pageCount 進去組字串。
const CHANNEL_PLACEHOLDER_PAGES: Omit<ScreenPage, 'badge'>[] = [
  {
    id: 'page-1',
    title: 'PROJECT ONE',
    subtitle: 'Placeholder subtitle — replace with real project summary',
    accentColor: '#39ff14',
  },
  {
    id: 'page-2',
    title: 'PROJECT TWO',
    subtitle: 'Placeholder subtitle — replace with real project summary',
    accentColor: '#5aa9e6',
  },
  {
    id: 'page-3',
    title: 'PROJECT THREE',
    subtitle: 'Placeholder subtitle — replace with real project summary',
    accentColor: '#ffb066',
  },
  {
    id: 'page-4',
    title: 'PROJECT FOUR',
    subtitle: 'Placeholder subtitle — replace with real project summary',
    accentColor: '#e05a5a',
  },
]

export const SCREEN_PAGES: ScreenPage[] = CHANNEL_PLACEHOLDER_PAGES.map((page, i) => ({
  ...page,
  badge: `CH ${i + 1}/${CHANNEL_PLACEHOLDER_PAGES.length}`,
}))

// DVD 選片播放頁用的強調色——跟 SCREEN_PAGES 分開一組調色盤，PROJECTS
// 數量不固定（目前3筆），用取餘數的方式循環套色，不用跟頁數綁死。
const PROJECT_ACCENT_COLORS = ['#39ff14', '#5aa9e6', '#ffb066', '#e05a5a', '#c77dff']

// 把選中的 Project 轉成螢幕要畫的 ScreenPage——DVD 選片流程專用，跟旋鈕
// 轉台的 SCREEN_PAGES 是平行的兩條內容來源，共用同一個型別/同一套
// canvas 繪圖邏輯（screenCanvas.ts 的 drawPage 只認 ScreenPage，不管
// 這個 page 究竟是轉台轉出來的還是放 DVD放出來的）。
export function projectToScreenPage(project: Project, index: number): ScreenPage {
  return {
    id: project.id,
    badge: 'DVD',
    title: project.title.toUpperCase(),
    subtitle: project.description,
    accentColor: PROJECT_ACCENT_COLORS[index % PROJECT_ACCENT_COLORS.length],
  }
}
