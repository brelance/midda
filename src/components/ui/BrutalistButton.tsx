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
    inline-flex items-center justify-center
    rounded-lg text-[13px] font-medium
    px-4 py-1.5
    transition-all duration-150 ease-in-out
    cursor-pointer select-none
    focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007aff] focus-visible:ring-offset-1
  `;

  const variantClasses =
    variant === "primary"
      ? "bg-[#007aff] text-white hover:bg-[#0071f3] active:bg-[#006ee0]"
      : "bg-black/[0.06] text-[#333] hover:bg-black/[0.1] active:bg-black/[0.14]";

  const disabledClasses = disabled ? "opacity-40 cursor-not-allowed pointer-events-none" : "";

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
