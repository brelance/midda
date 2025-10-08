import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  className = '',
}) => {
  return (
    <div
      className={`
        w-full h-5
        bg-white
        border-4 border-black
        rounded-lg
        p-1
        ${className}
      `}
    >
      <div
        className="h-full bg-[#808000] rounded-md transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );
};

export default ProgressBar;