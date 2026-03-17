import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  variant?: "default" | "success" | "danger";
  hint?: string;
}

export default function StatCard({ label, value, variant = "default", icon, hint }: StatCardProps) {
  const borderColor =
    variant === "success"
      ? "border-l-success"
      : variant === "danger"
      ? "border-l-destructive"
      : "border-l-foreground/20";

  return (
    <div className={`rounded-md border border-l-[3px] ${borderColor} bg-card p-3`}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        {icon}
      </div>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{hint}</p>}
    </div>
  );
}
