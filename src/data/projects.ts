import type { Project } from '@/cores/types/project'

// Placeholder 內容——一片 DVD 對應一筆，數量會決定 DVD 盒裡要排幾片碟。
// 真實履歷內容確定後直接替換這裡，不用動任何渲染邏輯。
export const PROJECTS: Project[] = [
  {
    id: 'project-1',
    title: 'Project One',
    description: 'Placeholder project description.',
    tech: ['React', 'TypeScript'],
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
