"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const avatarTones = [
  "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
  "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
];

const sizeClasses = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-xs",
  lg: "h-12 w-12 text-sm",
};

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
}

export function Avatar({
  name,
  avatarUrl,
  size = "md",
  className,
  ...props
}: AvatarProps) {
  const [imageError, setImageError] = React.useState(false);
  const normalizedUrl = avatarUrl?.trim();

  const initials = React.useMemo(() => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (
      parts[parts.length - 2][0] + parts[parts.length - 1][0]
    ).toUpperCase();
  }, [name]);

  const toneClass = React.useMemo(() => {
    if (!name) return avatarTones[0];
    const hash = [...name].reduce(
      (total, char) => total + char.charCodeAt(0),
      0
    );
    return avatarTones[hash % avatarTones.length];
  }, [name]);

  if (normalizedUrl && !imageError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={normalizedUrl}
        alt={name || "Avatar"}
        onError={() => setImageError(true)}
        className={cn(
          "inline-flex shrink-0 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-800",
          sizeClasses[size],
          className
        )}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-mono font-bold tracking-wider ring-1 ring-black/5 dark:ring-white/10",
        sizeClasses[size],
        toneClass,
        className
      )}
      {...props}
    >
      {initials}
    </span>
  );
}
