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
        rounded-xl
        border border-gray-100
        shadow-sm
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default BrutalistCard;