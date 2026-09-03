"use client";

import { cn } from "@/lib/utils";
import { Heart } from "lucide-react";
import { CENTER_INFO } from "@/lib/constants";

type LogoProps = {
  className?: string;
  iconOnly?: boolean;
  size?: "sm" | "md" | "lg";
};

export function Logo({ className, iconOnly = false, size = "md" }: LogoProps) {
  const sizeClasses = {
    sm: { icon: 28, title: "text-sm", sub: "text-[9px]" },
    md: { icon: 36, title: "text-base", sub: "text-[10px]" },
    lg: { icon: 44, title: "text-lg", sub: "text-xs" },
  };

  const s = sizeClasses[size];

  return (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-glass">
        <Heart size={s.icon * 0.55} />
      </div>
      {!iconOnly && (
        <div>
          <p className={cn("font-black text-text leading-tight tracking-tight", s.title)}>
            {CENTER_INFO.shortName}
          </p>
          <p className={cn("font-semibold text-muted leading-tight max-w-[200px]", s.sub)}>
            {CENTER_INFO.legalForm} — Kindu
          </p>
        </div>
      )}
    </div>
  );
}
