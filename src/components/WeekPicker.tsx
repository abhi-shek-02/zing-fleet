import { ChevronLeft, ChevronRight } from "lucide-react";
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
    <div className="flex items-center justify-between gap-2 rounded-md border bg-background px-2 py-1.5">
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prev} disabled={currentIdx >= sessions.length - 1}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium">{current?.label ?? "Select week"}</span>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={next} disabled={currentIdx <= 0}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
