// 一個作品項目 = 一片 DVD。內容目前都是 placeholder，等真的履歷資料到位
// 再填——見 CLAUDE.md 的 Data Layer 規則。
export interface Project {
  id: string
  title: string
  description: string
  tech: string[]
  url?: string
  // 3D 場景用的圖——DVD 光碟標籤面（DVD.tsx）、盒子封面內頁沒給
  // caseCover 時的退回值。跟 2D 作品頁（ProjectPage.tsx）無關，那邊
  // 固定顯示像素風佔位方塊，不用這個欄位（使用者確認過兩者是分開的
  // 需求，不要共用同一張圖）。選填，沒給值時 3D 那邊維持 Blender 原本
  // 烤好的材質。
  thumbnail?: string
  // DVD 盒封面內頁專用圖——跟 thumbnail 故意分開兩個欄位，因為光碟
  // 標籤（圓形）跟盒子封面（矩形）適合的圖不一定是同一張，沒給值時
  // DVDCase.tsx 會退回用 thumbnail。
  caseCover?: string
}
