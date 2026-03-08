// src/utils/googleDriveAPI.ts

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
// 【修改】擴充權限：加入 spreadsheets 的讀寫權限
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
    if (window.gapi && window.google) {
      resolve();
      return;
    }

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
            if (resp.error) {
              console.error('登入失敗:', resp);
              return;
            }
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

export const requireLogin = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (accessToken) {
      resolve(accessToken);
      return;
    }
    if (!tokenClient) {
      reject('Google API 尚未初始化');
      return;
    }
    tokenClient.callback = (resp: any) => {
      if (resp.error) {
        reject(resp.error);
        return;
      }
      accessToken = resp.access_token;
      resolve(resp.access_token);
    };
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
};

export const showDrivePicker = async (type: 'json' | 'spreadsheet' = 'json'): Promise<{ id: string; name: string } | null> => {
  const token = await requireLogin();
  return new Promise((resolve) => {
    const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS);
    if (type === 'json') {
      view.setMimeTypes('application/json');
    } else {
      view.setMimeTypes('application/vnd.google-apps.spreadsheet');
    }

    const picker = new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(token)
      .setDeveloperKey(API_KEY)
      .setCallback((data: any) => {
        if (data.action === window.google.picker.Action.PICKED) {
          const file = data.docs[0];
          resolve({ id: file.id, name: file.name });
        } else if (data.action === window.google.picker.Action.CANCEL) {
          resolve(null);
        }
      })
      .build();
    picker.setVisible(true);
  });
};

export const loadFileFromDrive = async (fileId: string): Promise<any> => {
  const token = await requireLogin();
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('無法讀取檔案');
  return await response.json();
};

export const saveFileToDrive = async (fileName: string, data: any, existingFileId?: string): Promise<string> => {
  const token = await requireLogin();
  const fileContent = JSON.stringify(data);
  const metadata = { name: `${fileName}.json`, mimeType: 'application/json' };

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

// 【新增】Google Sheets 讀取 (模組 E4)
export const fetchSpreadsheetData = async (spreadsheetId: string, range: string): Promise<string[][]> => {
  const token = await requireLogin();
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('無法讀取試算表');
  const result = await response.json();
  return result.values || [];
};

// 【新增】Google Sheets 寫入 (模組 E4)
export const updateSpreadsheetData = async (spreadsheetId: string, range: string, values: string[][]): Promise<void> => {
  const token = await requireLogin();
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values })
  });
  if (!response.ok) throw new Error('無法寫入試算表');
};