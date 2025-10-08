import React from 'react';
import NavItem from './NavItem';
import { NavigationItem } from '../../types/types';

interface NavMenuProps {
  activeNav: NavigationItem;
  onNavChange: (nav: NavigationItem) => void;
}

const NavMenu: React.FC<NavMenuProps> = ({ activeNav, onNavChange }) => {
  const navItems = [
    {
      id: 'bookshelf' as NavigationItem,
      label: '书架',
      icon: (
        <svg
          className="w-6 h-6 mr-3"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
        </svg>
      ),
    },
    {
      id: 'discover' as NavigationItem,
      label: '发现',
      icon: (
        <svg
          className="w-6 h-6 mr-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
            d="M8 16l4-4-4-4m4 4l4-4-4-4"
          />
        </svg>
      ),
    },
    {
      id: 'store' as NavigationItem,
      label: '书城',
      icon: (
        <svg
          className="w-6 h-6 mr-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
      ),
    },
  ];

  return (
    <ul>
      {navItems.map((item) => (
        <li key={item.id} className="mt-2 first:mt-0">
          <NavItem
            item={item}
            isActive={activeNav === item.id}
            onClick={() => onNavChange(item.id)}
          />
        </li>
      ))}
    </ul>
  );
};

export default NavMenu;