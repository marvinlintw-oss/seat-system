// src/utils/venueIO.ts
import type { Seat } from '../types';

export interface VenueConfig {
  seats: Seat[];
  backgroundImage: string | null;
  type: string;
  version: string;
}

/**
 * 將場地設定匯出為 JSON 檔案
 */
export const exportVenueJSON = (seats: Seat[], backgroundImage: string | null) => {
  const data: VenueConfig = { seats, backgroundImage, type: 'venue-only', version: '3.1' };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `venue-layout-${new Date().toISOString().slice(0, 10)}.venue.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * 讀取並解析場地 JSON 檔案
 */
export const importVenueJSON = (file: File): Promise<VenueConfig> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!Array.isArray(json.seats)) throw new Error('Invalid Format');
        resolve(json as VenueConfig);
      } catch (err) {
        reject(new Error('匯入失敗：場地格式錯誤'));
      }
    };
    reader.onerror = () => reject(new Error('瀏覽器讀取檔案發生錯誤'));
    reader.readAsText(file);
  });
};