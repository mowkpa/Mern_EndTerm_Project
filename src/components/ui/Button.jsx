import React from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

export const Button = React.forwardRef(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled = false,
      className = '',
      type = 'button',
      onClick,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-control transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-mine focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none';

    const variants = {
      primary: 'bg-mine text-white hover:bg-[#312ecb] active:bg-[#2825a5]',
      secondary:
        'bg-surface text-ink border border-line hover:bg-paper hover:border-text-2/40 active:bg-paper/80',
      ghost: 'bg-transparent text-text-2 hover:text-ink hover:bg-paper active:bg-line/50',
      danger: 'bg-danger text-white hover:bg-[#d03d42] active:bg-[#b83237]',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs gap-1.5',
      md: 'h-10 px-4 text-sm gap-2',
      lg: 'h-11 px-5 text-base gap-2.5',
    };

    return (
      <motion.button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        onClick={onClick}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
