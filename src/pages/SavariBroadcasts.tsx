import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils-date";
import {
  buildBookingGroups,
  filterByPill,
  listAvgRpKm,
  parseBooking,
  sortParsedBookings,
  type ListFilterPill,
  type ParsedBooking,
  type SavariSortKey,
} from "@/lib/savariBooking";
import { toast } from "@/hooks/use-toast";
import { LoadingSpinner, ErrorState, EmptyState } from "@/components/LoadingState";
import { SwipeToAccept } from "@/components/SwipeToAccept";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const ALL = "__all__";

const FILTER_PILLS: { id: ListFilterPill; label: string }[] = [
  { id: "all", label: "All" },
  { id: "prepaid", label: "Pre-paid only" },
  { id: "urgent6h", label: "Urgent <6h" },
  { id: "surged", label: "Surged" },
];

const SORT_OPTIONS: { id: SavariSortKey; label: string }[] = [
  { id: "urgency", label: "Urgency" },
  { id: "earnings", label: "Earnings" },
  { id: "rpkm", label: "₹/km" },
  { id: "lowRisk", label: "Low risk" },
];

export default function SavariBroadcastsPage() {
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ["savaari", "broadcasts"],
    queryFn: () => api.getSavaariBroadcasts({ booking_id: "0" }),
  });

  const items = q.data?.items ?? [];
  const resultset = q.data?.resultset;
  const totalBookings =
    resultset != null && typeof resultset.totalCount === "number"
      ? resultset.totalCount
      : items.length;

  const parsedAll = useMemo(
    () => (items as Record<string, unknown>[]).map(parseBooking),
    [items],
  );

  const [pill, setPill] = useState<ListFilterPill>("all");
  const [sortKey, setSortKey] = useState<SavariSortKey>("urgency");
  const [carFilter, setCarFilter] = useState(ALL);
  const [paymentFilter, setPaymentFilter] = useState(ALL);
  const [tripTypeFilter, setTripTypeFilter] = useState(ALL);

  const { carOptions, paymentOptions, tripTypeOptions } = useMemo(() => {
    const cars = new Set<string>();
    const pays = new Set<string>();
    const trips = new Set<string>();
    for (const p of parsedAll) {
      if (p.carType) cars.add(p.carType);
      if (p.paymentLabel) pays.add(p.paymentLabel);
      if (p.tripTypeName.trim()) trips.add(p.tripTypeName);
    }
    const sort = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base" });
    return {
      carOptions: [...cars].sort(sort),
      paymentOptions: [...pays].sort(sort),
      tripTypeOptions: [...trips].sort(sort),
    };
  }, [parsedAll]);

  const filtered = useMemo(() => {
    let list = filterByPill(parsedAll, pill);
    if (carFilter !== ALL) list = list.filter((p) => p.carType === carFilter);
    if (paymentFilter !== ALL) list = list.filter((p) => p.paymentLabel === paymentFilter);
    if (tripTypeFilter !== ALL) list = list.filter((p) => p.tripTypeName === tripTypeFilter);
    return list;
  }, [parsedAll, pill, carFilter, paymentFilter, tripTypeFilter]);

  const sorted = useMemo(() => sortParsedBookings(filtered, sortKey), [filtered, sortKey]);

  const stats = useMemo(() => {
    const totalEarn = filtered.reduce((s, p) => s + p.vendorCost, 0);
    const prepaidN = filtered.filter((p) => p.isPrepaid).length;
    const urgentN = filtered.filter((p) => p.hoursLeft != null && p.hoursLeft < 6).length;
    const avg = listAvgRpKm(filtered);
    return { totalEarn, prepaidN, urgentN, avg };
  }, [filtered]);

  const groups = useMemo(() => buildBookingGroups(parsedAll), [parsedAll]);

  const hasExtraFilters = carFilter !== ALL || paymentFilter !== ALL || tripTypeFilter !== ALL;

  const openDetail = (p: ParsedBooking) => {
    navigate(`/savari/booking/${encodeURIComponent(p.bookingId)}`, {
      state: { row: p.row },
    });
  };

  const onAccept = (p: ParsedBooking) => {
    toast({
      title: "Accepted (local)",
      description: `Booking #${p.bookingId} — hook Savaari accept API when available.`,
    });
  };

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 py-4 pb-8">
      <div className="mb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="shrink-0" asChild>
          <Link to="/login" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight">Open bookings ({totalBookings})</h1>
          <p className="text-xs text-muted-foreground">Rule-based cards — no AI</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={() => void q.refetch()}
          disabled={q.isFetching}
          aria-label="Refresh"
        >
          <RefreshCw className={cn("h-4 w-4", q.isFetching && "animate-spin")} />
        </Button>
      </div>

      {!q.isLoading && !q.isError && items.length > 0 && (
        <div className="mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 rounded-lg border bg-card px-3 py-2 text-xs sm:grid-cols-4">
            <div>
              <p className="text-[10px] text-muted-foreground">Total earn</p>
              <p className="font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
                {formatCurrency(stats.totalEarn)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Pre-paid</p>
              <p className="font-medium tabular-nums">
                {stats.prepaidN}/{filtered.length || parsedAll.length}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Urgent</p>
              <p className="font-medium tabular-nums">{stats.urgentN}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Avg ₹/km</p>
              <p className="font-medium tabular-nums">{stats.avg.toFixed(1)}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {FILTER_PILLS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setPill(f.id)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  pill === f.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-muted/40 text-muted-foreground hover:bg-muted",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-medium text-muted-foreground">Sort:</span>
            {SORT_OPTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSortKey(s.id)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  sortKey === s.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-muted/40 text-muted-foreground hover:bg-muted",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <FilterSelect label="Car" value={carFilter} options={carOptions} onChange={setCarFilter} />
            <FilterSelect
              label="Payment"
              value={paymentFilter}
              options={paymentOptions}
              onChange={setPaymentFilter}
            />
            <FilterSelect
              label="Trip type"
              value={tripTypeFilter}
              options={tripTypeOptions}
              onChange={setTripTypeFilter}
            />
          </div>

          {(pill !== "all" || hasExtraFilters) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => {
                setPill("all");
                setCarFilter(ALL);
                setPaymentFilter(ALL);
                setTripTypeFilter(ALL);
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      )}

      {q.isLoading && <LoadingSpinner label="Loading broadcasts..." />}
      {q.isError && (
        <ErrorState
          message={q.error instanceof Error ? q.error.message : "Failed to load"}
          onRetry={() => void q.refetch()}
        />
      )}
      {!q.isLoading && !q.isError && items.length === 0 && (
        <EmptyState
          title="No broadcasts"
          subtitle="The feed returned no items, or the server token is not configured."
          icon={<RefreshCw className="mx-auto h-8 w-8 text-muted-foreground/40" />}
        />
      )}

      {!q.isLoading && !q.isError && items.length > 0 && (
        <Tabs defaultValue="solo" className="w-full">
          <TabsList className="mb-3 grid w-full grid-cols-2">
            <TabsTrigger value="solo">Solo bookings</TabsTrigger>
            <TabsTrigger value="groups">Group bookings</TabsTrigger>
          </TabsList>

          <TabsContent value="solo" className="mt-0 space-y-3">
            {sorted.length === 0 && (
              <EmptyState
                title="No matches"
                subtitle="Try changing or clearing filters."
                icon={<RefreshCw className="mx-auto h-8 w-8 text-muted-foreground/40" />}
              />
            )}
            {sorted.map((p, i) => (
              <BookingCard
                key={`${p.bookingId}-${i}`}
                p={p}
                onOpenDetail={() => openDetail(p)}
                onAccept={() => onAccept(p)}
              />
            ))}
          </TabsContent>

          <TabsContent value="groups" className="mt-0 space-y-3">
            {groups.length === 0 ? (
              <p className="rounded-lg border border-dashed bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
                No clusters yet — need at least two compatible one-ways (same car, reverse or repeat
                corridor).
              </p>
            ) : (
              groups.map((g) => (
                <Card key={g.id} className="overflow-hidden border-blue-500/30">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold leading-tight">{g.title}</p>
                        <p className="text-[11px] text-muted-foreground">{g.subtitle}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">
                        {g.kind === "return_pair" ? "Return pair" : "Repeat corridor"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 border-y border-border py-2 text-center text-[10px]">
                      <div>
                        <p className="text-muted-foreground">Combined earn</p>
                        <p className="font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
                          {formatCurrency(g.combinedEarn)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">
                          {g.gapHours != null ? "Gap" : "Bookings"}
                        </p>
                        <p className="font-medium tabular-nums text-blue-600 dark:text-blue-400">
                          {g.gapHours != null
                            ? `${g.gapHours < 48 ? g.gapHours.toFixed(1) + "h" : (g.gapHours / 24).toFixed(1) + "d"}`
                            : g.bookings.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Dead km est.</p>
                        <p className="font-medium tabular-nums">
                          {g.deadKmSavedEstimate != null ? `~${Math.round(g.deadKmSavedEstimate)}` : "—"}
                        </p>
                      </div>
                    </div>
                    <ol className="space-y-2">
                      {g.bookings.map((b, idx) => (
                        <li
                          key={b.bookingId}
                          className="flex gap-2 border-b border-border/60 pb-2 text-xs last:border-0 last:pb-0"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex justify-between gap-2">
                              <span className="font-medium">{b.routeLabel}</span>
                              <span className="shrink-0 text-emerald-600 tabular-nums dark:text-emerald-400">
                                {formatCurrency(b.vendorCost)}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              {b.pickupTimeLabel || "—"} ·{" "}
                              {b.packageKms > 0 ? `${Math.round(b.packageKms)} km` : "—"} · #
                              {b.bookingId}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">{g.insight}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => openDetail(g.bookings[0])}
                      >
                        Open first booking →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 text-xs">
          <SelectValue placeholder={`All`} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All</SelectItem>
          {options.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function BookingCard({
  p,
  onOpenDetail,
  onAccept,
}: {
  p: ParsedBooking;
  onOpenDetail: () => void;
  onAccept: () => void;
}) {
  const timerClass =
    p.timerTone === "red"
      ? "text-red-500"
      : p.timerTone === "amber"
        ? "text-amber-500"
        : "text-emerald-500";

  const timerLabel =
    p.hoursLeft == null
      ? "—"
      : p.hoursLeft < 1
        ? `${Math.round(p.hoursLeft * 60)} min left`
        : `${p.hoursLeft.toFixed(1)}h left`;

  const borderL =
    p.borderAccent === "red"
      ? "border-l-4 border-l-red-500"
      : p.borderAccent === "amber"
        ? "border-l-4 border-l-amber-500"
        : "border-l-4 border-l-transparent";

  const scorePct = Math.min(100, Math.max(0, p.compositeScore));

  return (
    <Card className={cn("overflow-hidden shadow-sm", borderL)}>
      <CardContent className="p-0">
        <div className="p-4 pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-snug">{p.routeLabel}</p>
              <p className="text-[11px] text-muted-foreground">
                {p.pickupTimeLabel || "—"} · {p.packageKms > 0 ? `${Math.round(p.packageKms)} km` : "—"}
              </p>
              <p className="text-[11px] text-muted-foreground">{p.carType}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-lg font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
                {formatCurrency(p.vendorCost)}
              </p>
              <p className="text-[10px] text-muted-foreground">your earnings</p>
              <div className="mt-1 w-24">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all"
                    style={{ width: `${scorePct}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground tabular-nums">{p.compositeScore}/100</p>
              </div>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            {p.isPrepaid && (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                Pre Paid
              </span>
            )}
            {p.tripTypeName && (
              <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] text-foreground">
                {p.tripTypeName.length > 28 ? `${p.tripTypeName.slice(0, 28)}…` : p.tripTypeName}
              </span>
            )}
            {p.isSurged && (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-200">
                Heavily surged
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 divide-x divide-border border-y border-border bg-muted/20 text-center text-[10px]">
          <div className="py-2">
            <p className="text-muted-foreground">₹/km</p>
            <p
              className={cn(
                "font-semibold tabular-nums",
                p.rpKm < 8 ? "text-amber-600 dark:text-amber-400" : "text-foreground",
              )}
            >
              {p.packageKms > 0 ? p.rpKm.toFixed(1) : "—"}
            </p>
          </div>
          <div className="py-2">
            <p className="text-muted-foreground">Cash risk</p>
            <p
              className={cn(
                "font-semibold tabular-nums",
                p.cashRiskPct <= 5 ? "text-emerald-600" : p.cashRiskPct >= 50 ? "text-red-500" : "text-foreground",
              )}
            >
              {p.cashRiskPct.toFixed(0)}%
            </p>
          </div>
          <div className="py-2">
            <p className="text-muted-foreground">Collect</p>
            <p className="font-semibold tabular-nums">
              {p.cashToCollect > 0 ? formatCurrency(p.cashToCollect) : "—"}
            </p>
          </div>
          <div className="py-2">
            <p className="text-muted-foreground">Night alw.</p>
            <p className="font-semibold tabular-nums">
              {p.nightAllowance > 0 ? formatCurrency(p.nightAllowance) : "—"}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-border px-4 py-2 text-xs">
          <span className="text-muted-foreground">Expires</span>
          <span className={cn("font-medium tabular-nums", timerClass)}>{timerLabel}</span>
        </div>

        <div className="flex items-center gap-2 p-3">
          <div className="min-w-0 flex-1">
            <SwipeToAccept onAccept={onAccept} />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-12 w-12 shrink-0 rounded-xl"
            aria-label="Booking detail & analysis"
            onClick={onOpenDetail}
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
