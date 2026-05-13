import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  padding?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick, padding = true }) => (
  <div
    className={`mc-card ${padding ? 'p-4' : ''} ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''} ${className}`}
    onClick={onClick}
  >
    {children}
  </div>
);

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'orange' | 'green' | 'blue' | 'red' | 'purple';
  sub?: string;
}

const colorMap = {
  orange: 'bg-brand-50 text-brand-600',
  green:  'bg-green-50 text-green-600',
  blue:   'bg-blue-50 text-blue-600',
  red:    'bg-red-50 text-red-600',
  purple: 'bg-purple-50 text-purple-600',
};

export const StatsCard: React.FC<StatsCardProps> = ({ label, value, icon, color = 'orange', sub }) => (
  <Card>
    <div className="flex items-start gap-3">
      <div className={`p-2.5 rounded-xl ${colorMap[color]} flex-shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-ink-500 font-medium truncate">{label}</p>
        <p className="text-xl font-bold text-ink-900 leading-tight mt-0.5">{value}</p>
        {sub && <p className="text-xs text-ink-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  </Card>
);

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
  badge?: string | number;
}

export const QuickAction: React.FC<QuickActionProps> = ({ icon, label, onClick, color = 'bg-brand-500', badge }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-2 p-4 mc-card active:scale-[0.96] transition-transform w-full"
  >
    <div className={`${color} text-white p-3 rounded-2xl relative`}>
      {icon}
      {badge !== undefined && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-bold">
          {badge}
        </span>
      )}
    </div>
    <span className="text-xs font-semibold text-ink-700 text-center leading-tight">{label}</span>
  </button>
);
