"use client";
import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[color-mix(in_oklab,_var(--brand)_25%,_transparent)]",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

