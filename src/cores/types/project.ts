// 一個作品項目 = 一片 DVD。內容目前都是 placeholder，等真的履歷資料到位
// 再填——見 CLAUDE.md 的 Data Layer 規則。
export interface Project {
  id: string
  title: string
  description: string
  tech: string[]
  url?: string
  // 2D 作品頁（ProjectPage.tsx）上方截圖區顯示的作品截圖。選填，沒給值
  // 時顯示像素風佔位方塊。跟下面兩個 3D 用的欄位故意分開，不共用同一張
  // 圖（使用者確認過兩者是各自獨立的需求）。
  screenshot?: string
  // 3D 場景用的圖——DVD 光碟標籤面（DVD.tsx）、盒子封面內頁沒給
  // caseCover 時的退回值。跟 2D 作品頁無關，不要拿來當作品頁截圖
  // （那個用 screenshot）。選填，沒給值時 3D 那邊維持 Blender 原本
  // 烤好的材質。
  thumbnail?: string
  // DVD 盒封面內頁專用圖——跟 thumbnail 故意分開兩個欄位，因為光碟
  // 標籤（圓形）跟盒子封面（矩形）適合的圖不一定是同一張，沒給值時
  // DVDCase.tsx 會退回用 thumbnail。
  caseCover?: string
}
