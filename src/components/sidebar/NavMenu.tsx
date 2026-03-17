import React from 'react';
import NavItem from './NavItem';
import { NavigationItem } from '../../types/types';

interface NavMenuProps {
  activeNav: NavigationItem;
  onNavChange: (nav: NavigationItem) => void;
}

// Small 16x16 icon wrapper for Apple Books sidebar
const Icon: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="w-4 h-4 mr-2 flex-shrink-0 text-gray-500">{children}</span>
);

const NavMenu: React.FC<NavMenuProps> = ({ activeNav, onNavChange }) => {
  const primaryItems = [
    {
      id: 'bookshelf' as NavigationItem,
      label: '主页',
      icon: (
        <Icon>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </Icon>
      ),
    },
    {
      id: 'discover' as NavigationItem,
      label: '发现',
      icon: (
        <Icon>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Icon>
      ),
    },
    {
      id: 'store' as NavigationItem,
      label: '书城',
      icon: (
        <Icon>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </Icon>
      ),
    },
  ];

  const libraryItems = [
    {
      id: 'bookshelf' as NavigationItem,
      label: '全部',
      icon: (
        <Icon>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
          </svg>
        </Icon>
      ),
    },
  ];

  return (
    <div className="overflow-y-auto">
      {/* Apple Books section */}
      <div className="mb-4">
        <div className="px-2 text-[11px] font-bold text-gray-500 mb-1 tracking-wide uppercase">
          Apple Books
        </div>
        {primaryItems.map((item) => (
          <NavItem
            key={item.id + item.label}
            item={item}
            isActive={activeNav === item.id && item.label === '主页'}
            onClick={() => onNavChange(item.id)}
          />
        ))}
      </div>

      {/* Library section */}
      <div className="mb-4">
        <div className="px-2 text-[11px] font-bold text-gray-500 mb-1 tracking-wide uppercase">
          书库
        </div>
        {libraryItems.map((item) => (
          <NavItem
            key={item.id + item.label}
            item={item}
            isActive={false}
            onClick={() => onNavChange(item.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default NavMenu;