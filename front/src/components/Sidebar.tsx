'use client';

import { useEffect, useMemo } from 'react';

type SidebarProps = {
  open: boolean;
  onClose?: () => void;
  /** 패널 너비(px). 기본 360 */
  width?: number;
  /** 레일 등 왼쪽/오른쪽 오프셋(px). 기본 64 */
  offset?: number;
  /** 패널 위치: 왼쪽/오른쪽 */
  side?: 'left' | 'right';
  /** 오버레이(배경) 표시 및 클릭으로 닫기 */
  withBackdrop?: boolean;
  className?: string;
  children: React.ReactNode;
};

export default function Sidebar({
  open,
  onClose,
  width = 360,
  offset = 64,
  side = 'left',
  withBackdrop = true,
  className = '',
  children,
}: SidebarProps) {
  // ESC로 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const style = useMemo<React.CSSProperties>(
    () =>
      side === 'left'
        ? { width, left: offset }
        : { width, right: offset },
    [width, offset, side]
  );

  const translateClosed =
    side === 'left' ? '-translate-x-full' : 'translate-x-full';

  return (
    <>
      {/* Backdrop */}
      {/* {withBackdrop && (
        <div
          className={`fixed inset-0 z-40 transition-opacity duration-300 ${
            open ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
          style={{ background: 'rgba(0,0,0,0.25)' }}
          onClick={onClose}
          aria-hidden={!open}
        />
      )} */}

      {/* Panel (overlay) */}
      <aside
        className={`fixed top-0 z-50 h-full bg-white border-r shadow-lg will-change-transform transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : translateClosed
        } ${className}`}
        style={style}
        // 접근성 힌트
        aria-hidden={!open}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </aside>
    </>
  );
}