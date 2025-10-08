import React from 'react';

interface BrutalistCardProps {
  children: React.ReactNode;
  className?: string;
}

const BrutalistCard: React.FC<BrutalistCardProps> = ({
  children,
  className = '',
}) => {
  return (
    <div
      className={`
        bg-white
        border-4 border-black
        rounded-[20px]
        shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
        transition-all duration-100 ease-in-out
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default BrutalistCard;