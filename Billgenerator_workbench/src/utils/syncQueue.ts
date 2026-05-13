import type { CustomerBill, PurchaseBill } from '../types';
import { appendCustomerBillWithItems, appendPurchaseBill } from './googleSheets';

type PendingType = 'customer' | 'purchase';

interface PendingItem {
  id: string;
  type: PendingType;
  data: CustomerBill | PurchaseBill;
  timestamp: string;
}

const QUEUE_KEY = 'mc-sync-queue';

const getQueue = (): PendingItem[] => {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as PendingItem[]; }
  catch { return []; }
};

const saveQueue = (q: PendingItem[]) => {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch { /* storage full */ }
};

export const enqueuePending = (type: PendingType, data: CustomerBill | PurchaseBill): void => {
  const q = getQueue();
  q.push({
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    type,
    data,
    timestamp: new Date().toISOString(),
  });
  saveQueue(q);
};

export const getPendingCount = (): number => getQueue().length;

export const getPendingItems = (): PendingItem[] => getQueue();

export const clearPendingItem = (id: string): void => {
  saveQueue(getQueue().filter(it => it.id !== id));
};

export const clearAllPending = (): void => {
  localStorage.removeItem(QUEUE_KEY);
};

export const syncAllPending = async (): Promise<number> => {
  const queue = getQueue();
  if (queue.length === 0) return 0;

  let synced = 0;
  for (const item of queue) {
    try {
      if (item.type === 'customer') {
        await appendCustomerBillWithItems(item.data as CustomerBill);
      } else {
        await appendPurchaseBill(item.data as PurchaseBill);
      }
      clearPendingItem(item.id);
      synced++;
    } catch {
      // Leave in queue for next retry
    }
  }
  return synced;
};
