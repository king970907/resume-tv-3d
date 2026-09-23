// 一個作品項目 = 一片 DVD。內容目前都是 placeholder，等真的履歷資料到位
// 再填——見 CLAUDE.md 的 Data Layer 規則。
export interface Project {
  id: string
  title: string
  description: string
  tech: string[]
  url?: string
  // 專案截圖/縮圖路徑——選填，沒有的話作品頁改顯示像素風佔位方塊
  // （見 ProjectPage.tsx），不會整頁空白或報錯。
  thumbnail?: string
}
