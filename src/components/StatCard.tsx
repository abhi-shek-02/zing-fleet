import { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  variant?: "default" | "success" | "danger";
  hint?: string;
  trend?: number; // percentage change
  compact?: boolean;
}

export default function StatCard({ label, value, variant = "default", icon, hint, trend, compact }: StatCardProps) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-1 transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium text-muted-foreground leading-none">{label}</p>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <p className={`text-lg font-semibold tabular-nums leading-tight ${
        variant === "success" ? "text-success" : variant === "danger" ? "text-destructive" : "text-foreground"
      }`}>
        {value}
      </p>
      {(hint || trend !== undefined) && (
        <div className="flex items-center gap-1.5">
          {trend !== undefined && (
            <span className={`flex items-center gap-0.5 text-[10px] font-medium ${
              trend > 0 ? "text-success" : trend < 0 ? "text-destructive" : "text-muted-foreground"
            }`}>
              {trend > 0 ? <TrendingUp className="h-3 w-3" /> : trend < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              {Math.abs(trend).toFixed(1)}%
            </span>
          )}
          {hint && <p className="text-[10px] text-muted-foreground leading-tight">{hint}</p>}
        </div>
      )}
    </div>
  );
}
