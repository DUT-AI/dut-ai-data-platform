import * as React from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type NoticeTone = "neutral" | "info" | "success" | "warning" | "danger";

interface NoticeProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: NoticeTone;
  title?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}

const toneStyles: Record<
  NoticeTone,
  {
    container: string;
    icon: string;
    defaultIcon: LucideIcon;
  }
> = {
  neutral: {
    container: "border-slate-200 bg-slate-50 text-slate-700",
    icon: "text-slate-500",
    defaultIcon: Info,
  },
  info: {
    container: "border-sky-200 bg-sky-50 text-sky-800",
    icon: "text-sky-600",
    defaultIcon: Info,
  },
  success: {
    container: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: "text-emerald-600",
    defaultIcon: CheckCircle2,
  },
  warning: {
    container: "border-amber-200 bg-amber-50 text-amber-900",
    icon: "text-amber-600",
    defaultIcon: AlertTriangle,
  },
  danger: {
    container: "border-rose-200 bg-rose-50 text-rose-800",
    icon: "text-rose-600",
    defaultIcon: AlertCircle,
  },
};

export function Notice({
  tone = "info",
  title,
  icon,
  children,
  className,
  ...props
}: NoticeProps) {
  const currentTone = toneStyles[tone] ?? toneStyles.info;
  const IconComponent = icon ?? currentTone.defaultIcon;
  const isAlert = tone === "danger" || tone === "warning";

  return (
    <div
      role={isAlert ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3.5 text-xs leading-5",
        currentTone.container,
        className
      )}
      {...props}
    >
      <IconComponent
        className={cn("mt-0.5 h-4 w-4 shrink-0", currentTone.icon)}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        {title && (
          <p className="mb-1 font-semibold leading-tight text-inherit">
            {title}
          </p>
        )}
        <div className="leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
