import type { Project } from '@/cores/types/project'
import projectsData from './projects.json'

// 一片 DVD 對應一筆，數量會決定 DVD 盒裡要排幾片碟。內容放在
// projects.json（跟程式碼分開，方便直接編輯/置換），這裡只負責掛型別、
// 給其他檔案 import——JSON 本身不能寫型別/註解，型別檢查跟語意說明都
// 留在這裡做。
export const PROJECTS: Project[] = projectsData
