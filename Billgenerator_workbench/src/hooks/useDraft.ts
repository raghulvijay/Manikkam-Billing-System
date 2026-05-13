import { useEffect, useRef, useState } from 'react';

const DRAFT_KEY = 'mc_invoice_draft';

export const useDraft = () => {
  const [hasDraft, setHasDraft] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DRAFT_KEY) !== null;
    } catch {
      return false;
    }
  });

  const draftRef = useRef<unknown>(null);

  const saveDraft = (data: unknown): void => {
    try {
      draftRef.current = data;
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
      setHasDraft(true);
    } catch {
      // ignore storage errors
    }
  };

  const loadDraft = (): unknown | null => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const clearDraft = (): void => {
    try {
      localStorage.removeItem(DRAFT_KEY);
      draftRef.current = null;
      setHasDraft(false);
    } catch {
      // ignore
    }
  };

  // Auto-save every 30s if there's a pending draft in the ref
  useEffect(() => {
    const interval = setInterval(() => {
      if (draftRef.current !== null) {
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify(draftRef.current));
        } catch {
          // ignore
        }
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return { saveDraft, loadDraft, clearDraft, hasDraft };
};
