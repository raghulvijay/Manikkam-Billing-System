import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  rightElement?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, showBack = false, rightElement }) => {
  const navigate = useNavigate();

  return (
    <header className="app-header no-print">
      {/* Left: back button or spacer */}
      <div className="w-10 flex-shrink-0">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors text-[var(--text-primary)]"
            aria-label="Go back"
          >
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Center: title */}
      <div className="flex-1 text-center px-2">
        {title ? (
          <span className="font-semibold text-[15px] text-[var(--text-primary)] truncate">{title}</span>
        ) : (
          <span
            className="text-[17px] font-bold text-[var(--accent)]"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Manikkam &amp; Co
          </span>
        )}
      </div>

      {/* Right: optional element or spacer */}
      <div className="w-10 flex-shrink-0 flex justify-end">
        {rightElement ?? null}
      </div>
    </header>
  );
};
