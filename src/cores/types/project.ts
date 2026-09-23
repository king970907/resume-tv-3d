// 一個作品項目 = 一片 DVD。內容目前都是 placeholder，等真的履歷資料到位
// 再填——見 CLAUDE.md 的 Data Layer 規則。
export interface Project {
  id: string
  title: string
  description: string
  tech: string[]
  url?: string
  // 專案截圖/縮圖路徑——選填，沒有的話作品頁改顯示像素風佔位方塊
  // （見 ProjectPage.tsx），不會整頁空白或報錯。同一張圖也拿來貼在
  // DVD 光碟標籤面（DVD.tsx）。
  thumbnail?: string
  // DVD 盒封面內頁專用圖——跟 thumbnail 故意分開兩個欄位，因為光碟
  // 標籤（圓形）跟盒子封面（矩形）適合的圖不一定是同一張，沒給值時
  // DVDCase.tsx 會退回用 thumbnail。
  caseCover?: string
}
