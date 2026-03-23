import React from 'react';
import NavItem from './NavItem';
import { NavigationItem } from '../../types/types';

interface NavMenuProps {
  activeNav: NavigationItem;
  onNavChange: (nav: NavigationItem) => void;
}

const NavMenu: React.FC<NavMenuProps> = ({ activeNav, onNavChange }) => {
  return (
    <nav className="space-y-5">
      {/* ── Primary ── */}
      <div>
        <NavItem
          label="主页"
          isActive={activeNav === 'bookshelf'}
          onClick={() => onNavChange('bookshelf')}
          icon={
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          }
        />
      </div>

      {/* ── 书库 ── */}
      <div>
        <div className="px-2 mb-1 text-[12px] font-medium text-[#86868b] tracking-wide select-none">
          书库
        </div>
        <NavItem
          label="全部"
          isActive={false}
          onClick={() => onNavChange('bookshelf')}
          icon={
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          }
        />
        <NavItem
          label="欲读清单"
          isActive={false}
          onClick={() => {}}
          icon={
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <NavItem
          label="已读完"
          isActive={false}
          onClick={() => {}}
          icon={
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* ── 我的藏书 ── */}
      <div>
        <div className="px-2 mb-1 text-[12px] font-medium text-[#86868b] tracking-wide select-none">
          我的藏书
        </div>
        <NavItem
          label="新建藏书"
          isActive={false}
          onClick={() => {}}
          icon={
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          }
        />
      </div>

      {/* ── 学习 ── */}
      <div>
        <div className="px-2 mb-1 text-[12px] font-medium text-[#86868b] tracking-wide select-none">
          学习
        </div>
        <NavItem
          label="生词本"
          isActive={activeNav === 'vocabulary'}
          onClick={() => onNavChange('vocabulary')}
          icon={
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10M4 18h7" />
            </svg>
          }
        />
      </div>
    </nav>
  );
};

export default NavMenu;