"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
}

export function PasswordInput({
  className = "",
  placeholder = "••••••••",
  autoComplete = "current-password",
  required = true,
  name = "password",
  id,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative w-full">
      <input
        type={showPassword ? "text" : "password"}
        name={name}
        id={id}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={`w-full pr-11 ${className}`}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShowPassword((prev) => !prev)}
        aria-label={showPassword ? "Hide password" : "Show password"}
        title={showPassword ? "Hide password" : "Show password"}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#636B62] transition-colors hover:bg-[#F0ECE3] hover:text-[#202820] focus:outline-none focus:ring-1 focus:ring-[#303B32]"
      >
        {showPassword ? (
          <EyeOff className="h-4 w-4 text-[#303B32]" />
        ) : (
          <Eye className="h-4 w-4 text-[#8C9288] hover:text-[#303B32]" />
        )}
      </button>
    </div>
  );
}
