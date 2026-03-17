import React from "react";
import NavMenu from "../sidebar/NavMenu";
import UserProfile from "../sidebar/UserProfile";
import SearchInput from "../ui/SearchInput";
import { User, NavigationItem } from "../../types/types";

interface SidebarProps {
  activeNav: NavigationItem;
  onNavChange: (nav: NavigationItem) => void;
  user: User;
  isMobile: boolean;
  isOpen: boolean;
  onClose: () => void;
  searchQuery?: string;
  onSearch?: (q: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeNav,
  onNavChange,
  user,
  isMobile,
  onClose,
  searchQuery = "",
  onSearch,
}) => {
  return (
    <aside
      className={`
        ${isMobile ? "w-full h-full" : "w-[240px]"}
        flex-shrink-0 flex flex-col
        bg-[rgba(236,236,236,0.92)] backdrop-blur-2xl
        border-r border-gray-200/60
      `}
    >
      {/* macOS traffic light controls (desktop only, decorative) */}
      {!isMobile && (
        <div className="h-12 flex items-center px-4 space-x-2 flex-shrink-0">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]" />
          <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]" />
        </div>
      )}

      {/* Mobile top bar */}
      {isMobile && (
        <div className="h-12 flex items-center justify-between px-4 flex-shrink-0">
          <span className="text-base font-semibold text-[#333]">Midda</span>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:bg-black/[0.06] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Search */}
      <div className="px-3 pb-3 flex-shrink-0">
        <SearchInput
          value={searchQuery}
          onChange={onSearch ?? (() => {})}
          placeholder="搜索"
          className="w-full"
        />
      </div>

      {/* Navigation groups */}
      <div className="flex-grow overflow-y-auto px-2">
        <NavMenu activeNav={activeNav} onNavChange={onNavChange} />
      </div>

      {/* User profile footer */}
      <div className="flex-shrink-0 border-t border-gray-200/50 px-2 py-3">
        <UserProfile user={user} />
      </div>
    </aside>
  );
};

export default Sidebar;
