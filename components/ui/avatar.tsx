"use client";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function Avatar({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  if (!src) {
    return (
      <div
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200",
          className
        )}
      >
        {alt?.[0]?.toUpperCase()}
      </div>
    );
  }
  return (
    <Image src={src} alt={alt} width={36} height={36} className={cn("h-9 w-9 rounded-full object-cover", className)} />
  );
}

