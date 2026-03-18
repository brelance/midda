import React from "react";
import NavMenu from "../sidebar/NavMenu";
import UserProfile from "../sidebar/UserProfile";
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
}) => {
  return (
    <aside
      className={`
        ${isMobile ? "w-full h-full" : "w-[220px]"}
        flex-shrink-0 flex flex-col
        bg-[rgba(244,244,244,0.92)] backdrop-blur-2xl
        border-r border-black/[0.08]
      `}
    >
      {/* Traffic light zone — no fake dots, just spacing for real ones */}
      {!isMobile && (
        <div
          className="h-[52px] flex-shrink-0"
          style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        />
      )}

      {/* Mobile close button */}
      {isMobile && (
        <div className="h-12 flex items-center justify-between px-4 flex-shrink-0">
          <span className="text-[15px] font-semibold text-[#1d1d1f]">Midda</span>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-black/[0.06] text-gray-500 hover:bg-black/[0.1] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Navigation groups */}
      <div className="flex-grow overflow-y-auto px-3">
        <NavMenu activeNav={activeNav} onNavChange={onNavChange} />
      </div>

      {/* User profile footer */}
      <div className="flex-shrink-0 px-3 py-3">
        <UserProfile user={user} />
      </div>
    </aside>
  );
};

export default Sidebar;
