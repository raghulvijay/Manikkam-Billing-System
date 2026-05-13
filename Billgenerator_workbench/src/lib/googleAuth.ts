const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets',
].join(' ');

const TOKEN_KEY = 'mc-google-token';
const CLIENT_ID_KEY = 'mc-gclient-id';

interface StoredToken { token: string; expiry: number; }

export const getClientId = (): string => {
  const env = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  if (env) return env;
  return localStorage.getItem(CLIENT_ID_KEY) ?? '';
};

export const setClientId = (id: string) => localStorage.setItem(CLIENT_ID_KEY, id);

export const getStoredToken = (): string | null => {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const data: StoredToken = JSON.parse(raw);
    if (Date.now() > data.expiry) { localStorage.removeItem(TOKEN_KEY); return null; }
    return data.token;
  } catch { return null; }
};

const storeToken = (token: string, expiresIn: number) => {
  const data: StoredToken = { token, expiry: Date.now() + (expiresIn - 60) * 1000 };
  localStorage.setItem(TOKEN_KEY, JSON.stringify(data));
};

export const clearToken = () => {
  const token = getStoredToken();
  if (token && typeof google !== 'undefined') {
    try { google.accounts.oauth2.revoke(token); } catch { /* ignore */ }
  }
  localStorage.removeItem(TOKEN_KEY);
};

export const isAuthenticated = (): boolean => getStoredToken() !== null;

let _tokenClient: google.accounts.oauth2.TokenClient | null = null;

const waitForGIS = (): Promise<void> =>
  new Promise(resolve => {
    const check = () => {
      if (typeof google !== 'undefined' && google.accounts?.oauth2) resolve();
      else setTimeout(check, 150);
    };
    check();
  });

export const initGoogleAuth = async (): Promise<void> => {
  const clientId = getClientId();
  if (!clientId) return;
  await waitForGIS();
  _tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES,
    callback: () => {},
  });
};

export const requestNewToken = (prompt = ''): Promise<string> =>
  new Promise(async (resolve, reject) => {
    if (!_tokenClient) {
      await initGoogleAuth();
      if (!_tokenClient) { reject(new Error('Google auth not initialized. Set VITE_GOOGLE_CLIENT_ID.')); return; }
    }
    let settled = false;
    const settle = (fn: () => void) => { if (!settled) { settled = true; fn(); } };

    _tokenClient.callback = (resp) => {
      if (resp.error) { settle(() => reject(new Error(resp.error_description ?? resp.error))); return; }
      storeToken(resp.access_token, resp.expires_in);
      settle(() => resolve(resp.access_token));
    };
    _tokenClient.requestAccessToken({ prompt });
  });

export const getToken = async (): Promise<string> => {
  const stored = getStoredToken();
  if (stored) return stored;
  return requestNewToken('');
};

export const signIn = (): Promise<string> => requestNewToken('select_account');
