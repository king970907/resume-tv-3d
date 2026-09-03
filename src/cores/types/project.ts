// 一個作品項目 = 一片 DVD。內容目前都是 placeholder，等真的履歷資料到位
// 再填——見 CLAUDE.md 的 Data Layer 規則。
export interface Project {
  id: string
  title: string
  description: string
  tech: string[]
  url?: string
}
