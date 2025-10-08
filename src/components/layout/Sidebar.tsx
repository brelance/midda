import React from 'react';
import NavMenu from '../sidebar/NavMenu';
import UserProfile from '../sidebar/UserProfile';
import { User, NavigationItem } from '../../types/types';

interface SidebarProps {
  activeNav: NavigationItem;
  onNavChange: (nav: NavigationItem) => void;
  user: User;
  isMobile: boolean;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeNav,
  onNavChange,
  user,
  isMobile,
  onClose,
}) => {
  return (
    <aside className={`
      ${isMobile ? 'w-full h-full' : 'w-64'}
      flex-shrink-0 bg-[#f5f5dc]
      ${isMobile ? 'border-r-0' : 'border-r-4 border-black'}
      flex flex-col p-4
    `}>
      {/* 移动端顶部栏（Logo + 关闭按钮） */}
      <div className="flex items-center justify-between mb-4">
        <div className={`flex items-center justify-center ${isMobile ? 'text-2xl' : 'text-3xl'} font-black`}>
          阅读器APP
        </div>

        {/* 移动端关闭按钮 */}
        {isMobile && (
          <button
            onClick={onClose}
            className="border-4 border-black rounded-[20px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-[#b3312c] text-white p-2 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[6px] active:translate-y-[6px] active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all duration-100"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
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