import React from 'react';
import type { CustomerBill, NoSalesDay } from '../types';
import { getDaysInMonth } from '../utils/dateFormat';

interface CalendarGridProps {
  year: number;
  month: number;
  bills: CustomerBill[];
  noSalesDays: NoSalesDay[];
  onDayClick: (date: string) => void;
}

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  year, month, bills, noSalesDays, onDayClick,
}) => {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const today = new Date();

  const billDateSet = new Set(bills.filter(b => b.status === 'active').map(b => b.date));
  const declarationDateSet = new Set(noSalesDays.map(n => n.date));

  const getDayStatus = (day: number): string => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayDate = new Date(dateStr + 'T00:00:00');
    if (dayDate > today) return 'future';
    if (billDateSet.has(dateStr)) return 'has-bill';
    if (declarationDateSet.has(dateStr)) return 'declaration';
    return 'missing';
  };

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Build calendar cells: empty slots + day numbers
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const handleDayClick = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayDate = new Date(dateStr + 'T00:00:00');
    if (dayDate > today) return;
    onDayClick(dateStr);
  };

  return (
    <div>
      {/* Day headers */}
      <div className="cal-grid">
        {DAY_LABELS.map(d => (
          <div key={d} className="cal-day-header">{d}</div>
        ))}
      </div>
      {/* Day cells */}
      <div className="cal-grid">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="cal-day empty" />;
          }
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const status = getDayStatus(day);
          const isToday = dateStr === todayStr;
          return (
            <div
              key={day}
              className={`cal-day ${status}${isToday ? ' today' : ''}`}
              onClick={() => handleDayClick(day)}
            >
              {day}
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-[var(--text-secondary)]">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded" style={{ background: '#D1FAE5' }} />
          Has Bills
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded" style={{ background: '#FEE2E2' }} />
          Missing
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded" style={{ background: '#DBEAFE' }} />
          Declaration
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded" style={{ background: '#F3F4F6' }} />
          Future
        </span>
      </div>
    </div>
  );
};
