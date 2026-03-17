import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getWeekSessions } from "@/lib/utils-date";

interface WeekPickerProps {
  value: string;
  onChange: (weekStart: string) => void;
}

export default function WeekPicker({ value, onChange }: WeekPickerProps) {
  const sessions = getWeekSessions(12);
  const currentIdx = sessions.findIndex((s) => s.start === value);

  const prev = () => {
    if (currentIdx < sessions.length - 1) onChange(sessions[currentIdx + 1].start);
  };
  const next = () => {
    if (currentIdx > 0) onChange(sessions[currentIdx - 1].start);
  };

  const current = sessions.find((s) => s.start === value);

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border bg-card px-2 py-1.5">
      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={prev} disabled={currentIdx >= sessions.length - 1}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm font-medium">{current?.label ?? "Select week"}</span>
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={next} disabled={currentIdx <= 0}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
