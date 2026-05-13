import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: React.ReactNode;
  color?: string;
  loading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  sublabel,
  icon,
  color = 'var(--accent)',
  loading = false,
}) => {
  return (
    <div
      className="rounded-xl border p-3"
      style={{
        background: '#fff',
        borderColor: 'var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      {loading ? (
        <>
          <div className="skeleton h-3 w-14 rounded mb-2" />
          <div className="skeleton h-5 w-20 rounded mb-1" />
          <div className="skeleton h-3 w-12 rounded" />
        </>
      ) : (
        <>
          {/* Label + icon row */}
          <div className="flex items-center gap-1.5 mb-1.5">
            {icon && (
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 [&>svg]:!w-3.5 [&>svg]:!h-3.5"
                style={{ background: 'var(--accent-light)', color }}
              >
                {icon}
              </div>
            )}
            <span
              className="text-[10px] font-semibold leading-tight"
              style={{ color: 'var(--text-secondary)' }}
            >
              {label}
            </span>
          </div>
          {/* Value */}
          <div
            className="text-[17px] font-bold leading-tight"
            style={{ color: 'var(--text-primary)', wordBreak: 'break-word' }}
          >
            {value}
          </div>
          {/* Sub-label */}
          {sublabel && (
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {sublabel}
            </div>
          )}
        </>
      )}
    </div>
  );
};
