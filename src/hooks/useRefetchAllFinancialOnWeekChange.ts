import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

const ALL_FINANCIAL_KEYS = [
  ["cash", "all"],
  ["vendor", "all"],
  ["fuel", "all"],
  ["otherCosts", "all"],
  ["otherEarnings", "all"],
  ["settlements", "all"],
] as const;

/** Pages that load all weeks then filter by `week` must refetch when `week` changes — query keys do not include week. */
export function useRefetchAllFinancialOnWeekChange(week: string) {
  const qc = useQueryClient();
  const skipFirst = useRef(true);
  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    void Promise.all(
      ALL_FINANCIAL_KEYS.map((queryKey) => qc.refetchQueries({ queryKey: [...queryKey] }))
    );
  }, [week, qc]);
}
