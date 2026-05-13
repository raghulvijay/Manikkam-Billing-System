import React from 'react';
import { useNavigate } from 'react-router-dom';

interface Props {
  title: string;
  showBack?: boolean;
  children: React.ReactNode;
}

export const Layout: React.FC<Props> = ({ title, showBack, children }) => {
  const navigate = useNavigate();
  return (
    <div className="app-wrapper">
      <div className="top-bar no-print">
        {showBack && (
          <button className="top-bar-back" onClick={() => navigate(-1)} aria-label="Back">
            ‹
          </button>
        )}
        <span className="top-bar-title">{title}</span>
      </div>
      <div className="page-body">{children}</div>
    </div>
  );
};
