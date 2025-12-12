import React from "react";

export interface BrutalistButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary";
}

const BrutalistButton: React.FC<BrutalistButtonProps> = ({
  children,
  variant = "default",
  className = "",
  disabled = false,
  type = "button",
  ...rest
}) => {
  const baseClasses = `
    border-4 border-black rounded-[20px]
    shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
    transition-all duration-100 ease-in-out
    cursor-pointer text-center font-black
    p-3 px-6 text-lg
    hover:translate-x-[3px] hover:translate-y-[3px]
    hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
    active:translate-x-[6px] active:translate-y-[6px]
    active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)]
  `;

  const variantClasses =
    variant === "primary"
      ? "bg-[#b3312c] text-white"
      : "bg-[#d4a017] text-white";

  const disabledClasses = disabled ? "opacity-50 cursor-not-allowed" : "";

  return (
    <button
      type={type}
      className={`${baseClasses} ${variantClasses} ${disabledClasses} ${className}`}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
};

export default BrutalistButton;
