import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "success" | "warning" | "error" | "primary" | "secondary";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-surface-mid text-muted",
  success: "bg-success/15 text-emerald-600 dark:text-emerald-400",
  warning: "bg-warning/15 text-amber-600 dark:text-amber-400",
  error: "bg-error/15 text-rose-600 dark:text-rose-400",
  primary: "bg-primary/15 text-primary dark:text-indigo-400",
  secondary: "bg-secondary/15 text-secondary dark:text-sky-400"
};

export function Badge({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: BadgeTone; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-bold", tones[tone], className)}>
      {children}
    </span>
  );
}
