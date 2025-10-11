import React from "react";
import ProgressBar from "../ui/ProgressBar";

interface ReaderProgressProps {
  progress: number;
  className?: string;
}

const ReaderProgress: React.FC<ReaderProgressProps> = ({
  progress,
  className = "",
}) => {
  const normalized = Math.min(100, Math.max(0, Number(progress.toFixed(1))));
  return (
    <div
      className={`flex w-full items-center gap-4 font-bold text-lg ${className}`}
    >
      <span>{normalized}%</span>
      <ProgressBar progress={normalized} />
    </div>
  );
};

export default ReaderProgress;
