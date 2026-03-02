// src/utils/projectIO.ts
import type { Project } from '../types';

/**
 * 將專案資料匯出為 JSON 檔案
 */
export const exportProjectJSON = (projectData: Project, filenamePrefix: string = 'project-full') => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projectData));
  const link = document.createElement('a');
  link.href = dataStr;
  link.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

/**
 * 讀取並解析專案 JSON 檔案
 */
export const importProjectJSON = (file: File): Promise<Project> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        resolve(json as Project);
      } catch (err) {
        reject(new Error('讀取失敗：專案檔案可能已損毀或格式錯誤'));
      }
    };
    reader.onerror = () => reject(new Error('瀏覽器讀取檔案發生錯誤'));
    reader.readAsText(file);
  });
};