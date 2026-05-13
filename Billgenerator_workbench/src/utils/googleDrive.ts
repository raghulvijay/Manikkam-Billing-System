import { getToken } from '../lib/googleAuth';

const DRIVE = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

const authHeaders = async (): Promise<Record<string, string>> => ({
  Authorization: `Bearer ${await getToken()}`,
});

const driveGet = async (url: string) => {
  const res = await fetch(url, { headers: await authHeaders() });
  if (!res.ok) throw new Error(`Drive API error ${res.status}: ${await res.text()}`);
  return res.json();
};

const drivePost = async (url: string, body: unknown) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...(await authHeaders()), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Drive API error ${res.status}: ${await res.text()}`);
  return res.json();
};

export const getOrCreateFolder = async (name: string, parentId?: string): Promise<string> => {
  const q = [
    `name='${name.replace(/'/g, "\\'")}'`,
    `mimeType='application/vnd.google-apps.folder'`,
    `trashed=false`,
    parentId ? `'${parentId}' in parents` : '',
  ].filter(Boolean).join(' and ');

  const data = await driveGet(`${DRIVE}/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`);
  if (data.files?.length) return data.files[0].id as string;

  const created = await drivePost(`${DRIVE}/files`, {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    parents: parentId ? [parentId] : [],
  });
  return created.id as string;
};

export const ensureFolderPath = async (parts: string[]): Promise<string> => {
  let parentId: string | undefined;
  for (const part of parts) {
    parentId = await getOrCreateFolder(part, parentId);
  }
  return parentId!;
};

export interface UploadResult { id: string; webViewLink: string; }

export const uploadFileToDrive = async (
  data: Blob | File,
  fileName: string,
  folderId: string,
  mimeType?: string,
): Promise<UploadResult> => {
  const token = await getToken();
  const meta = JSON.stringify({ name: fileName, parents: [folderId] });
  const mime = mimeType ?? (data instanceof File ? data.type : 'application/octet-stream');

  const form = new FormData();
  form.append('metadata', new Blob([meta], { type: 'application/json' }));
  form.append('file', data instanceof File ? data : new File([data], fileName, { type: mime }));

  const res = await fetch(`${UPLOAD}/files?uploadType=multipart&fields=id,webViewLink`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Upload failed ${res.status}: ${await res.text()}`);
  return res.json();
};

export const getFolderWebLink = (folderId: string): string =>
  `https://drive.google.com/drive/folders/${folderId}`;

export const getMonthFolderPath = (year: number, monthName: string): string[] =>
  ['Manikkam & Co', String(year), monthName];
