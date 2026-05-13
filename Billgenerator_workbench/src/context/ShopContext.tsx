import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ShopSettings } from '../types';

const SHOP_SETTINGS_KEY = 'mc-shop-settings';

const DEFAULT_SETTINGS: ShopSettings = {
  shopName: 'MANIKKAM & CO',
  gstin: '33AOAPL9789B1ZU',
  addressLine1: 'No.3/104, G.N.T Road, Karanodai, Chennai - 600 067',
  addressLine2: '',
  phone1: '9498411373',
  phone2: '9840456373',
  auditorEmail: '',
  spreadsheetId: '',
  lastBillNumber: '',
};

interface ShopContextType {
  settings: ShopSettings;
  updateSettings: (s: Partial<ShopSettings>) => void;
}

const ShopContext = createContext<ShopContextType>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
});

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<ShopSettings>(() => {
    try {
      const raw = localStorage.getItem(SHOP_SETTINGS_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  });

  useEffect(() => {
    localStorage.setItem(SHOP_SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (partial: Partial<ShopSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...partial };
      localStorage.setItem(SHOP_SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <ShopContext.Provider value={{ settings, updateSettings }}>
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = (): ShopContextType => useContext(ShopContext);

export { ShopContext, DEFAULT_SETTINGS };
