// 履歷全螢幕三頁（個人簡介/技能/工作經歷）的結構化內容——跟 screenPages.ts
// 的 RESUME_PAGES 是分開的兩份資料：RESUME_PAGES 給 3D 場景裡那塊小
// canvas 貼圖用（只需要 title/subtitle 兩段字），這裡給全螢幕 DOM 疊層
// 的 Undertale 風格頁面用（需要頭像、技能等級、工作經歷這種有結構的
// 內容），兩邊故意不共用同一個型別，畫面需求差太多硬套同一個形狀只會
// 讓兩邊都綁手綁腳。
//
// 目前全部是佔位內容（技能等級的方塊數量也是隨便填的，不是真的自評），
// 等真實履歷資料到位再替換，換資料不用動任何畫面元件。

export interface ResumeSkill {
  name: string
  // 0~8，對應畫面上的分段像素條格數。
  level: number
}

export interface ResumeSkillCategory {
  name: string
  skills: ResumeSkill[]
}

export interface ResumeJob {
  dates: string
  role: string
  company: string
  description: string
}

export const RESUME_INTRO = {
  name: 'JORDAN LIAO',
  role: 'FRONTEND / CREATIVE TECHNOLOGIST',
  bio: '（佔位文字）喜歡把介面做成可以互動的小機器——這個網站本身就是一台會轉台、會放光碟的電視。實際自介文字之後再換上。',
}

export const RESUME_SKILLS: ResumeSkillCategory[] = [
  {
    name: 'FRONTEND',
    skills: [
      { name: 'React / TypeScript', level: 7 },
      { name: 'CSS / 動畫設計', level: 6 },
      { name: 'GSAP', level: 6 },
    ],
  },
  {
    name: '3D / WEBGL',
    skills: [
      { name: 'Three.js / R3F', level: 6 },
      { name: 'Blender 建模', level: 5 },
      { name: 'Shader 基礎', level: 3 },
    ],
  },
  {
    name: 'TOOLING',
    skills: [
      { name: 'Git / CI', level: 6 },
      { name: 'Vite / 建置工具', level: 6 },
    ],
  },
]

export const RESUME_JOBS: ResumeJob[] = [
  {
    dates: '2023 — NOW',
    role: 'FRONTEND ENGINEER',
    company: 'PLACEHOLDER CO.',
    description: '（佔位文字）負責前端架構與互動體驗開發，實際內容之後再替換。',
  },
  {
    dates: '2021 — 2023',
    role: 'CREATIVE DEVELOPER',
    company: 'PLACEHOLDER STUDIO',
    description: '（佔位文字）打造品牌網站與 WebGL 互動專案，實際內容之後再替換。',
  },
  {
    dates: '2019 — 2021',
    role: 'JUNIOR DEVELOPER',
    company: 'PLACEHOLDER INC.',
    description: '（佔位文字）第一份前端工作，實際內容之後再替換。',
  },
]
