import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ProductEntry } from '../types';
import {
  getCachedEntries,
  updateCache,
  getCategories,
  getBrands,
  getProducts,
} from '../utils/productMaster';
import { fetchProductMaster } from '../utils/googleSheets';
import { useAuth } from './AuthContext';

interface ProductMasterContextValue {
  entries: ProductEntry[];
  categories: string[];
  getBrandsFor: (category?: string) => string[];
  getProductsFor: (category?: string, brand?: string) => ProductEntry[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const ProductMasterContext = createContext<ProductMasterContextValue | null>(null);

export const ProductMasterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [entries, setEntries] = useState<ProductEntry[]>(() => getCachedEntries());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const data = await fetchProductMaster();
      if (data.length > 0) {
        updateCache(data);
        setEntries(data);
      }
    } catch {
      // Keep cached / sample data
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value: ProductMasterContextValue = {
    entries,
    categories: getCategories(entries),
    getBrandsFor:   (category)        => getBrands(category, entries),
    getProductsFor: (category, brand) => getProducts(category, brand, entries),
    loading,
    refresh,
  };

  return (
    <ProductMasterContext.Provider value={value}>
      {children}
    </ProductMasterContext.Provider>
  );
};

export const useProductMaster = (): ProductMasterContextValue => {
  const ctx = useContext(ProductMasterContext);
  if (!ctx) throw new Error('useProductMaster must be used within ProductMasterProvider');
  return ctx;
};
