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
        text-[13px] font-medium text-[#1d1d1f]
        transition-colors duration-100 select-none
        ${isActive
          ? "bg-black/[0.08]"
          : "hover:bg-black/[0.04] active:bg-black/[0.08]"
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