import React from 'react';

interface NavItemProps {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ label, icon, isActive, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex items-center w-full gap-2 px-2 py-[5px] rounded-md
        text-[13px] select-none
        transition-all duration-100
        ${isActive
          ? "bg-[#007aff]/10 text-[#007aff] font-semibold"
          : "font-medium text-[#1d1d1f] hover:bg-black/[0.04] active:bg-black/[0.08] active:scale-[0.97]"
        }
      `}
    >
      <span className={`flex-shrink-0 ${isActive ? "text-[#007aff]" : "text-gray-500"}`}>
        {icon}
      </span>
      {label}
    </button>
  );
};

export default NavItem;