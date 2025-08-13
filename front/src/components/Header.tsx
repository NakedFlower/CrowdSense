'use client';

import React from 'react';
import Image from 'next/image';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const Header: React.FC<HeaderProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const railItems = [
    { label: '사이드바', icon: '/image/menu_icon.svg' }, // ← 새 토글 버튼 (길찾기 위)
    { label: '길찾기', icon: '/image/main_icon.svg' },
    { label: '근처 혼잡도', icon: '/image/person_icon.svg' },
    { label: '버스/지하철', icon: '/image/train_icon.svg' },
    { label: '저장', icon: '/image/star_icon.svg' },
    { label: '더보기', icon: '/image/more_icon.svg' },
  ] as const;

  return (
    <nav className="relative z-[60] bg-blue-100 flex flex-col items-center py-3 gap-3">
      {railItems.map((it) => (
        <button
          key={it.label}
          className={
            'w-10 h-10 grid place-items-center rounded-lg hover:bg-blue-50 text-xl transition-transform duration-200 ease-in-out hover:scale-105'
          }
          title={it.label}
          aria-label={it.label}
          aria-pressed={it.label === '사이드바' ? sidebarOpen : undefined}
          onClick={
            it.label === '사이드바'
              ? () => setSidebarOpen((v) => !v)
              : it.label === '길찾기'
              ? () => {
                  try {
                    // 사이드바를 항상 열고, Smart Around(기본) 화면으로 전환
                    setSidebarOpen(true);
                    window.dispatchEvent(new CustomEvent('sidebar-open', { detail: { mode: 'route' } }));
                  } catch (e) {
                    console.warn('route open failed', e);
                  }
                }
              : it.label === '근처 혼잡도'
              ? () => {
                  try {
                    window.dispatchEvent(new CustomEvent('open-nearby'));
                  } catch (e) {
                    console.warn('open-nearby dispatch failed', e);
                  }
                }
              : it.label === '더보기'
              ? () => {
                  window.location.href = '/admin/login';
                }
              : undefined
          }
        >
          <Image src={it.icon} alt={it.label} width={24} height={24} />
        </button>
      ))}
    </nav>
  );
};

export default Header;