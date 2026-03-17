import React from 'react';

interface NavItemProps {
  item: {
    id: string;
    label: string;
    icon: React.ReactNode;
  };
  isActive: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ item, isActive, onClick }) => {
  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`
        flex items-center px-2 py-1 rounded-md text-[13px] font-medium text-black
        transition-colors duration-100 select-none mt-0.5
        ${isActive ? 'bg-black/[0.08]' : 'hover:bg-black/[0.04]'}
      `}
    >
      {item.icon}
      {item.label}
    </a>
  );
};

export default NavItem;