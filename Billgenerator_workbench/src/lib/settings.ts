export interface Settings {
  shopName: string;
  shopAddress: string;
  shopPhone: string;
  shopGst: string;
  auditorEmail: string;
}

const SETTINGS_KEY = 'mc-settings-v1';

export const DEFAULT_SETTINGS: Settings = {
  shopName: 'Manikkam & Co',
  shopAddress: 'No.3/104, G.N.T Road, Karanodai, Chennai - 67',
  shopPhone: '9498411373 / 9840456373',
  shopGst: '33AOAPL9789B1ZU',
  auditorEmail: '',
};

export const getSettings = (): Settings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};

export const saveSettings = (s: Settings): void => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
};
