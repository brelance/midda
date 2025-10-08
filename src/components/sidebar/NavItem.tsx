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
        flex items-center p-3 rounded-2xl font-bold text-xl
        transition-all duration-200
        hover:bg-[#f0f0f0]
        ${isActive ? 'bg-[#b3312c] text-white' : 'text-black'}
      `}
    >
      {item.icon}
      {item.label}
    </a>
  );
};

export default NavItem;