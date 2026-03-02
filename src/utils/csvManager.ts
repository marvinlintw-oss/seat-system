// src/utils/csvManager.ts
import Papa from 'papaparse';
import { CSV_HEADERS } from './constants'; // 依賴您原本的常數檔

/**
 * 產生並下載 CSV 範本檔
 */
export const downloadCsvTemplate = () => {
  const bom = "\uFEFF"; // 確保 Excel 開啟不會亂碼
  const headerRow = CSV_HEADERS.map(h => h.label).join(",");
  const exampleRow = "範例姓名,範例職稱,範例單位,府院首長,95";
  const csvContent = bom + headerRow + "\n" + exampleRow;
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "personnel_import_template.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * 讀取並解析 CSV 檔案
 */
export const parseCsvFile = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (error) => reject(new Error('CSV 解析失敗: ' + error.message))
    });
  });
};