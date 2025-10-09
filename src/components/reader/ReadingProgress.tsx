import React from 'react';

interface ReadingProgressProps {
  progress: number; // 0-100
  className?: string;
}

const ReadingProgress: React.FC<ReadingProgressProps> = ({
  progress,
  className = '',
}) => {
  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      <span className="text-lg font-bold">{Math.round(progress)}%</span>
      <div className="w-full h-5 border-4 border-black bg-white p-1">
        <div
          className="bg-[#808000] h-full rounded-lg transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default ReadingProgress;