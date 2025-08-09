

'use client';

import React from 'react';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const Header: React.FC<HeaderProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const railItems = [
    { label: '지도 홈', icon: '🗺️' },
    { label: '길찾기', icon: '🧭' },
    { label: '버스/지하철', icon: '🚌' },
    { label: '거리뷰', icon: '📷' },
    { label: '저장', icon: '⭐' },
    { label: '더보기', icon: '⋯' },
  ] as const;

  return (
    <nav className="relative z-[60] bg-white border-r flex flex-col items-center py-3 gap-3">
      {railItems.map((it) => (
        <button
          key={it.label}
          className={
            'w-10 h-10 grid place-items-center rounded-lg hover:bg-gray-100 text-xl ' +
            (it.label === '지도 홈' && sidebarOpen ? 'ring-1 ring-gray-300' : '')
          }
          title={it.label}
          aria-label={it.label}
          aria-pressed={it.label === '지도 홈' ? sidebarOpen : undefined}
          onClick={it.label === '지도 홈' ? () => setSidebarOpen((v) => !v) : undefined}
        >
          {it.icon}
        </button>
      ))}

      <div className="mt-auto grid gap-2">
        <button
          className="w-10 h-10 grid place-items-center rounded-lg hover:bg-gray-100"
          title="내 위치"
        >
          📍
        </button>
        <button
          className="w-10 h-10 grid place-items-center rounded-lg hover:bg-gray-100"
          title="메뉴"
        >
          ☰
        </button>
      </div>
    </nav>
  );
};

export default Header;