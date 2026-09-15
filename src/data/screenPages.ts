// TV 螢幕要顯示的「頁面」資料——先用簡單佔位內容（純色塊+標題+副標），
// 之後真正要接作品內容時只要換這個陣列，畫面/貼圖邏輯不用動。旋鈕每按
// 一次就切到下一筆，繞回開頭；跟 DVDSelector 的 PROJECTS 是分開的兩組
// 資料，這次先不串在一起（見 CLAUDE.md 或對話紀錄裡的決定）。

export interface ScreenPage {
  id: string
  // 螢幕上顯示的大標題，全大寫比較有復古電視字幕的感覺。
  title: string
  subtitle: string
  // 背景/強調色——canvas 貼圖跟全螢幕 DOM 疊層共用同一份資料，兩邊都讀
  // 這個顏色，畫面才會一致。
  accentColor: string
}

export const SCREEN_PAGES: ScreenPage[] = [
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
