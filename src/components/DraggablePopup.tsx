import React, { useState, useRef, useEffect, useCallback } from "react";

interface DraggablePopupProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

const DraggablePopup: React.FC<DraggablePopupProps> = ({
  isOpen,
  onClose,
  children,
  title = "Popup",
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const popupRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation(); // 阻止事件冒泡
    if (popupRef.current) {
      setIsDragging(true);
      const rect = popupRef.current.getBoundingClientRect();
      setOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault(); // 阻止默认行为，如文本选择
        setPosition({
          x: e.clientX - offset.x,
          y: e.clientY - offset.y,
        });
      }
    },
    [isDragging, offset]
  );

  const handleMouseUp = useCallback((e: MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isOpen, handleMouseMove, handleMouseUp]);

  if (!isOpen) return null;

  return (
    <div
      ref={popupRef}
      className="fixed bg-white rounded-lg shadow-xl max-w-lg w-full p-4 z-50"
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
        cursor: isDragging ? "grabbing" : "default",
      }}
    >
      <div className="cursor-grab" onMouseDown={handleMouseDown}>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl font-semibold"
        aria-label="Close"
      >
        &times;
      </button>
      <div className="mt-2">{children}</div>
    </div>
  );
};

export default DraggablePopup;
