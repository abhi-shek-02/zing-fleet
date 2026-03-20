import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { addWeeks, format, parseISO, subWeeks } from "date-fns";
import { Button } from "@/components/ui/button";
import { getWeekLabel, getWeekStart } from "@/lib/utils-date";

interface WeekPickerProps {
  value: string;
  onChange: (weekStart: string) => void;
}

export default function WeekPicker({ value, onChange }: WeekPickerProps) {
  const thisMonday = getWeekStart();
  const goOlder = () => {
    onChange(format(subWeeks(parseISO(value), 1), "yyyy-MM-dd"));
  };
  const goNewer = () => {
    onChange(format(addWeeks(parseISO(value), 1), "yyyy-MM-dd"));
  };
  const atOrAfterCurrentWeek = value >= thisMonday;

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border bg-card px-2 py-1.5">
      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={goOlder} aria-label="Older week">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex items-center gap-1.5 min-w-0">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium truncate">{getWeekLabel(value)}</span>
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={goNewer} disabled={atOrAfterCurrentWeek} aria-label="Newer week">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
