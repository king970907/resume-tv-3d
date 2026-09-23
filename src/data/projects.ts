import type { Project } from '@/cores/types/project'

// Placeholder 內容——一片 DVD 對應一筆，數量會決定 DVD 盒裡要排幾片碟。
// 真實履歷內容確定後直接替換這裡，不用動任何渲染邏輯。
export const PROJECTS: Project[] = [
  {
    id: 'project-1',
    title: 'Project One',
    description: 'Placeholder project description.',
    tech: ['React', 'TypeScript'],
    // 測試用縮圖——驗證光碟標籤/盒子封面貼圖用的真實圖片，之後有正式的
    // 專案縮圖再換掉，不算最終內容。兩張圖故意不同，光碟標籤跟盒子封面
    // 不用貼同一張。
    thumbnail: '/thumbnails/project-1.png',
    caseCover: '/thumbnails/case-1.png',
  },
  {
    id: 'project-2',
    title: 'Project Two',
    description: 'Placeholder project description.',
    tech: ['Three.js'],
  },
  {
    id: 'project-3',
    title: 'Project Three',
    description: 'Placeholder project description.',
    tech: ['Node.js'],
  },
]
