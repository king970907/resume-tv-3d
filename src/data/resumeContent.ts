import resumeData from './resumeContent.json'

// 履歷全螢幕三頁（個人簡介/技能/工作經歷）的結構化內容——跟 screenPages.ts
// 的 RESUME_PAGES 是分開的兩份資料：RESUME_PAGES 給 3D 場景裡那塊小
// canvas 貼圖用（只需要 title/subtitle 兩段字），這裡給全螢幕 DOM 疊層
// 的 Undertale 風格頁面用（需要頭像、技能等級、工作經歷這種有結構的
// 內容），兩邊故意不共用同一個型別，畫面需求差太多硬套同一個形狀只會
// 讓兩邊都綁手綁腳。
//
// 內容放在 resumeContent.json（跟程式碼分開，方便直接編輯/置換），這裡
// 只負責掛型別、給其他檔案 import。
//
// 目前全部是佔位內容（技能等級的方塊數量也是隨便填的，不是真的自評），
// 等真實履歷資料到位再替換，換 JSON 內容不用動任何畫面元件/型別。

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

export const RESUME_INTRO: { name: string; role: string; bio: string } = resumeData.intro
export const RESUME_SKILLS: ResumeSkillCategory[] = resumeData.skills
export const RESUME_JOBS: ResumeJob[] = resumeData.jobs
