import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, FilePlus, Upload, Search, Package } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/',                label: 'Home',     icon: Home    },
  { path: '/invoice/new',     label: 'Bill',     icon: FilePlus },
  { path: '/upload/purchase', label: 'Upload',   icon: Upload  },
  { path: '/search',          label: 'Search',   icon: Search  },
  { path: '/hsn',             label: 'Products', icon: Package },
] as const;

export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <nav className="bottom-nav no-print">
      {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
        <button
          key={path}
          className={`bottom-nav-item${isActive(path) ? ' active' : ''}`}
          onClick={() => navigate(path)}
          aria-label={label}
        >
          <Icon size={20} strokeWidth={isActive(path) ? 2.2 : 1.8} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
};
