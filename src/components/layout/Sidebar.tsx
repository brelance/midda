import React from 'react';
import NavMenu from '../sidebar/NavMenu';
import UserProfile from '../sidebar/UserProfile';
import { User, NavigationItem } from '../../types/types';

interface SidebarProps {
  activeNav: NavigationItem;
  onNavChange: (nav: NavigationItem) => void;
  user: User;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeNav,
  onNavChange,
  user,
}) => {
  return (
    <aside className="w-64 flex-shrink-0 bg-[#f5f5dc] border-r-4 border-black flex flex-col p-4">
      {/* Logo */}
      <div className="h-16 flex items-center justify-center font-black text-3xl mb-4">
        阅读器APP
      </div>

      {/* 导航菜单 */}
      <nav className="flex-grow">
        <NavMenu activeNav={activeNav} onNavChange={onNavChange} />
      </nav>

      {/* 用户信息 */}
      <div className="pt-4 border-t-4 border-black">
        <UserProfile user={user} />
      </div>
    </aside>
  );
};

export default Sidebar;