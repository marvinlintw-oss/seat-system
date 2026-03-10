// src/utils/googleDriveAPI.ts

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets'; 

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

let tokenClient: any = null;
let accessToken: string | null = null;

export const initGoogleAPI = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.gapi && window.google) { resolve(); return; }

    const loadGapi = new Promise<void>((res) => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        window.gapi.load('client:picker', {
          callback: async () => {
            await window.gapi.client.init({ apiKey: API_KEY });
            res();
          },
        });
      };
      document.body.appendChild(script);
    });

    const loadGsi = new Promise<void>((res) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => {
        tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (resp: any) => {
            if (resp.error) { console.error('登入失敗:', resp); return; }
            accessToken = resp.access_token;
          },
        });
        res();
      };
      document.body.appendChild(script);
    });

    Promise.all([loadGapi, loadGsi]).then(() => resolve()).catch(reject);
  });
};

export const clearGoogleToken = () => {
  accessToken = null;
};

export const requireLogin = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (accessToken) { resolve(accessToken); return; }
    if (!tokenClient) { reject('Google API 尚未初始化'); return; }
    tokenClient.callback = (resp: any) => {
      if (resp.error) { reject(resp.error); return; }
      accessToken = resp.access_token;
      resolve(resp.access_token);
    };
    tokenClient.requestAccessToken({ prompt: '' }); 
  });
};

export const showDrivePicker = async (type: 'json' | 'spreadsheet' = 'json'): Promise<{ id: string; name: string } | null> => {
  const token = await requireLogin();
  return new Promise((resolve) => {
    const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS);
    if (type === 'json') view.setMimeTypes('application/json');
    else view.setMimeTypes('application/vnd.google-apps.spreadsheet');

    const picker = new window.google.picker.PickerBuilder()
      .addView(view).setOAuthToken(token).setDeveloperKey(API_KEY)
      .setCallback((data: any) => {
        if (data.action === window.google.picker.Action.PICKED) { resolve({ id: data.docs[0].id, name: data.docs[0].name }); } 
        else if (data.action === window.google.picker.Action.CANCEL) { resolve(null); }
      }).build();
    picker.setVisible(true);
  });
};

export const showFolderPicker = async (): Promise<{ id: string; name: string } | null> => {
  const token = await requireLogin();
  return new Promise((resolve) => {
    const view = new window.google.picker.DocsView(window.google.picker.ViewId.FOLDERS);
    view.setIncludeFolders(true);
    view.setSelectFolderEnabled(true); 
    view.setMimeTypes('application/vnd.google-apps.folder');

    const picker = new window.google.picker.PickerBuilder()
      .addView(view).setOAuthToken(token).setDeveloperKey(API_KEY)
      .setCallback((data: any) => {
        if (data.action === window.google.picker.Action.PICKED) { resolve({ id: data.docs[0].id, name: data.docs[0].name }); } 
        else if (data.action === window.google.picker.Action.CANCEL) { resolve(null); }
      }).build();
    picker.setVisible(true);
  });
};

export const loadFileFromDrive = async (fileId: string): Promise<any> => {
  const token = await requireLogin();
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error('無法讀取檔案');
  return await response.json();
};

export const saveFileToDrive = async (fileName: string, data: any, existingFileId?: string, folderId?: string): Promise<string> => {
  const token = await requireLogin();
  const fileContent = JSON.stringify(data);
  const metadata: any = { name: `${fileName}.json`, mimeType: 'application/json' };
  
  if (!existingFileId && folderId) {
      metadata.parents = [folderId];
  }

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([fileContent], { type: 'application/json' }));

  const url = existingFileId 
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

  const response = await fetch(url, {
    method: existingFileId ? 'PATCH' : 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });

  if (!response.ok) throw new Error('存檔失敗');
  const result = await response.json();
  return result.id;
};

// 🟢 升級版：智慧抓取真實的分頁名稱，並攔截 API 錯誤訊息
export const fetchSpreadsheetData = async (spreadsheetId: string, fallbackRange: string = 'A:Z'): Promise<{values: string[][], sheetName: string}> => {
  const token = await requireLogin();

  // 1. 先取得試算表 Meta，抓出第一個工作表的真實名稱
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
     headers: { Authorization: `Bearer ${token}` }
  });

  if (!metaRes.ok) {
     const errInfo = await metaRes.json().catch(() => ({}));
     const errMsg = errInfo.error?.message || '';
     if (errMsg.includes('API has not been used')) {
         throw new Error('尚未啟用 API！請至 Google Cloud Console 啟用「Google Sheets API」。');
     }
     if (metaRes.status === 403) {
         throw new Error('權限不足！請確認登入時有勾選「查看與編輯 Google 試算表」的權限。');
     }
     throw new Error(`讀取試算表資訊失敗: ${errMsg}`);
  }

  const meta = await metaRes.json();
  const firstSheetName = meta.sheets[0].properties.title; // 智慧取得真實名稱 (例如: Sheet1, 工作表1)

  // 2. 組合正確的 Range 去抓資料
  const safeRange = fallbackRange.includes('!') ? fallbackRange.split('!')[1] : fallbackRange;
  const finalRange = `${firstSheetName}!${safeRange}`;

  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${finalRange}`, {
     headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
     const errInfo = await response.json().catch(() => ({}));
     throw new Error(`讀取資料失敗: ${errInfo.error?.message || response.statusText}`);
  }
  const result = await response.json();
  return { values: result.values || [], sheetName: firstSheetName };
};

export const updateSpreadsheetData = async (spreadsheetId: string, range: string, values: string[][]): Promise<void> => {
  const token = await requireLogin();
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
    method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ values })
  });
  if (!response.ok) {
     const errInfo = await response.json().catch(() => ({}));
     throw new Error(`寫回試算表失敗: ${errInfo.error?.message || response.statusText}`);
  }
};