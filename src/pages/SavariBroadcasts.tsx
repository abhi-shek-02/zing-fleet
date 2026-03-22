import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Bot, ChevronDown, ExternalLink, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils-date";
import {
  formatExpiresLabel,
  formatPickupDateTimeParts,
  formatSavariDateTime,
  googleMapsSearchUrl,
} from "@/lib/savariDisplay";
import {
  buildBookingGroups,
  computeGroupDebug,
  filterRowsByFleetCar,
  listAvgRpKm,
  parseBooking,
  sortParsedBookings,
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

const SORT_OPTIONS: { id: SavariSortKey; label: string }[] = [
  { id: "urgency", label: "Urgency" },
  { id: "earnings", label: "Earnings" },
  { id: "rpkm", label: "₹/km" },
  { id: "prepaidFirst", label: "Pre-paid first" },
];

const CAR_CHIPS: { id: string; label: string }[] = [
  { id: ALL, label: "All" },
  { id: "etios", label: "Etios" },
  { id: "wagon", label: "Wagon R" },
];

function matchesCarChip(p: ParsedBooking, carId: string): boolean {
  if (carId === ALL) return true;
  const n = p.carType.toLowerCase();
  if (carId === "etios") return /\betios\b/i.test(p.carType) && !/crysta/i.test(n);
  if (carId === "wagon")
    return /wagon\s*r|wagonr/i.test(n) || (n.includes("wagon") && n.includes("r"));
  return true;
}

export default function SavariBroadcastsPage() {
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ["savaari", "broadcasts"],
    queryFn: () => api.getSavaariBroadcasts({ booking_id: "0" }),
  });

  const rawItems = q.data?.items ?? [];
  const rawCount = rawItems.length;

  const fleetRows = useMemo(
    () => filterRowsByFleetCar(rawItems as Record<string, unknown>[]),
    [rawItems],
  );

  const parsedAll = useMemo(
    () => fleetRows.map((row) => parseBooking(row)),
    [fleetRows],
  );

  const [sortKey, setSortKey] = useState<SavariSortKey>("urgency");
  const [carChip, setCarChip] = useState(ALL);
  const [paymentFilter, setPaymentFilter] = useState(ALL);
  const [tripTypeFilter, setTripTypeFilter] = useState(ALL);

  const { paymentOptions, tripTypeOptions } = useMemo(() => {
    const pays = new Set<string>();
    const trips = new Set<string>();
    for (const p of parsedAll) {
      if (p.paymentLabel) pays.add(p.paymentLabel);
      if (p.tripTypeName.trim()) trips.add(p.tripTypeName);
    }
    const sort = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base" });
    return {
      paymentOptions: [...pays].sort(sort),
      tripTypeOptions: [...trips].sort(sort),
    };
  }, [parsedAll]);

  const filtered = useMemo(() => {
    let list = parsedAll;
    list = list.filter((p) => matchesCarChip(p, carChip));
    if (paymentFilter !== ALL) list = list.filter((p) => p.paymentLabel === paymentFilter);
    if (tripTypeFilter !== ALL) list = list.filter((p) => p.tripTypeName === tripTypeFilter);
    return list;
  }, [parsedAll, carChip, paymentFilter, tripTypeFilter]);

  const sorted = useMemo(() => sortParsedBookings(filtered, sortKey), [filtered, sortKey]);

  const stats = useMemo(() => {
    const totalEarn = filtered.reduce((s, p) => s + p.vendorCost, 0);
    const prepaidN = filtered.filter((p) => p.isPrepaid).length;
    const avg = listAvgRpKm(filtered);
    return { totalEarn, prepaidN, avg };
  }, [filtered]);

  const groups = useMemo(() => buildBookingGroups(parsedAll), [parsedAll]);
  const groupDebug = useMemo(() => computeGroupDebug(rawCount, parsedAll), [rawCount, parsedAll]);

  const hasExtraFilters = carChip !== ALL || paymentFilter !== ALL || tripTypeFilter !== ALL;

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
          <h1 className="text-xl font-semibold tracking-tight">
            Open bookings ({parsedAll.length})
          </h1>
          <p className="text-xs text-muted-foreground">
            {rawCount > 0 && (
              <>
                Feed {rawCount} · Showing Etios &amp; Wagon R · rule-based
              </>
            )}
            {rawCount === 0 && "Rule-based cards — no AI"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="outline" size="sm" className="h-9 gap-1 px-2 text-xs" asChild>
            <Link to="/savari/bot">
              <Bot className="h-3.5 w-3.5" />
              Bot
            </Link>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => void q.refetch()}
            disabled={q.isFetching}
            aria-label="Refresh"
          >
            <RefreshCw className={cn("h-4 w-4", q.isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      {!q.isLoading && !q.isError && rawItems.length > 0 && (
        <div className="mb-4 space-y-4">
          <div className="grid grid-cols-3 gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs">
            <div>
              <p className="text-[10px] text-muted-foreground">Total earn</p>
              <p className="font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
                {formatCurrency(stats.totalEarn)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Pre-paid</p>
              <p className="font-medium tabular-nums text-sky-700 dark:text-sky-300">
                {stats.prepaidN}/{filtered.length}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Avg ₹/km</p>
              <p className="font-semibold tabular-nums text-amber-700 dark:text-amber-300">
                {stats.avg.toFixed(1)}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Sort
            </p>
            <div className="flex flex-wrap gap-1.5">
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
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Car (fleet)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {CAR_CHIPS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCarChip(c.id)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    carChip === c.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-muted/40 text-muted-foreground hover:bg-muted",
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
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

          {hasExtraFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => {
                setCarChip(ALL);
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
      {!q.isLoading && !q.isError && rawItems.length === 0 && (
        <EmptyState
          title="No broadcasts"
          subtitle="The feed returned no items, or the server token is not configured."
          icon={<RefreshCw className="mx-auto h-8 w-8 text-muted-foreground/40" />}
        />
      )}

      {!q.isLoading && !q.isError && rawItems.length > 0 && (
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
              <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-4 text-sm">
                <p className="mb-2 font-medium text-foreground">No route groups yet</p>
                <p className="mb-3 text-muted-foreground">
                  Groups need two one-way bookings with both pickup &amp; drop cities, matching car, and
                  pickup times (reverse route within 5 days, or same corridor twice).
                </p>
                <div className="rounded-md bg-muted/50 p-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
                  <div>raw feed: {groupDebug.rawFeedCount}</div>
                  <div>after Etios/Wagon R: {groupDebug.fleetFilteredCount}</div>
                  <div>eligible (not round-trip): {groupDebug.eligibleForPairing}</div>
                  <div>with both cities: {groupDebug.withBothCities}</div>
                  <div>with pickup time parsed: {groupDebug.withPickupTime}</div>
                  <div>round-trip skipped: {groupDebug.roundTripSkipped}</div>
                </div>
              </div>
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
                              <span className="font-medium">{b.routeTitleShort}</span>
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
          <SelectValue placeholder="All" />
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
  const [open, setOpen] = useState(false);

  const timerClass =
    p.timerTone === "red"
      ? "text-red-600 dark:text-red-400"
      : p.timerTone === "amber"
        ? "text-amber-600 dark:text-amber-400"
        : "text-emerald-600 dark:text-emerald-400";

  const borderL =
    p.borderAccent === "red" ? "border-l-4 border-l-red-500" : "border-l-4 border-l-transparent";

  const scorePct = Math.min(100, Math.max(0, p.compositeScore));

  const addrLine = p.pickAddress || p.pickCity;
  const mapsUrl = addrLine ? googleMapsSearchUrl(addrLine) : "";

  const parts = formatPickupDateTimeParts(p.pickupTimeLabel);
  const kmStr = p.packageKms > 0 ? `${Math.round(p.packageKms)} km` : "—";

  return (
    <Card className={cn("overflow-hidden shadow-sm", borderL)}>
      <CardContent className="p-0">
        <div className="p-4 pb-2">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
              #{p.bookingId}
            </span>
          </div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold leading-snug tracking-tight text-foreground">
                {p.routeTitleShort}
              </p>
              <p className="text-[11px] text-muted-foreground">{p.carType}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-lg font-bold text-emerald-600 tabular-nums dark:text-emerald-400">
                {formatCurrency(p.vendorCost)}
              </p>
              <p className="text-[10px] text-muted-foreground">your earnings</p>
              <p className="mt-0.5 text-[11px] font-medium tabular-nums text-slate-700 dark:text-slate-300">
                {formatCurrency(p.totalAmt)}{" "}
                <span className="font-normal text-muted-foreground">total</span>
              </p>
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
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mt-2 flex w-full items-center justify-between rounded-lg border border-dashed border-violet-300/50 bg-violet-500/5 px-2 py-1.5 text-left text-[11px] font-medium text-muted-foreground transition-colors hover:bg-violet-500/10"
          >
            <span>Rate &amp; step times</span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
          </button>
          {open && (
            <div className="mt-2 space-y-1 rounded-md border bg-card px-2 py-2 text-[11px]">
              <RowMini label="Rate change (step 1)" value={p.rateChangeStep1 || "—"} plain />
              <RowMini label="Step 1" value={p.step1At || "—"} />
              <RowMini label="Step 2" value={p.step2At || "—"} />
              <RowMini label="Step 3" value={p.step3At || "—"} />
            </div>
          )}
        </div>

        <div className="border-y border-border bg-muted/15">
          <div className="grid grid-cols-3 divide-x divide-border text-center text-[10px]">
            <div className="bg-muted/30 py-2.5">
              <p className="text-muted-foreground">₹/km</p>
              <p
                className={cn(
                  "text-sm font-bold tabular-nums",
                  p.rpKm < 8 ? "text-amber-600 dark:text-amber-400" : "text-foreground",
                )}
              >
                {p.packageKms > 0 ? p.rpKm.toFixed(1) : "—"}
              </p>
            </div>
            <div className="bg-muted/30 py-2.5">
              <p className="text-muted-foreground">Collect</p>
              <p className="text-sm font-bold tabular-nums text-foreground">
                {p.cashToCollect > 0 ? formatCurrency(p.cashToCollect) : "—"}
              </p>
            </div>
            <div className="bg-sky-500/10 py-2 dark:bg-sky-500/15">
              <p className="text-[9px] font-medium uppercase tracking-wide text-sky-800/80 dark:text-sky-200/90">
                Pickup trip
              </p>
              <p className="text-xs font-bold leading-tight text-sky-900 dark:text-sky-100">{parts.dateStr}</p>
              <p className="text-xs font-bold leading-tight text-sky-900 dark:text-sky-100">{parts.timeStr}</p>
              <p className="text-xs font-bold leading-tight text-sky-900 dark:text-sky-100">{kmStr}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-border bg-amber-500/5 px-4 py-2 text-xs">
          <span className="font-medium text-muted-foreground">Expires</span>
          <span className={cn("font-bold tabular-nums", timerClass)}>
            {formatExpiresLabel(p.hoursLeft)}
          </span>
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

        {addrLine ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-2 border-t border-border bg-slate-50/90 px-3 py-3 text-[11px] leading-snug text-slate-800 transition-colors hover:bg-slate-100 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-900"
          >
            <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600" aria-hidden />
            <span>
              <span className="font-semibold text-foreground">Pickup address · </span>
              {addrLine}
            </span>
          </a>
        ) : null}
      </CardContent>
    </Card>
  );
}

function RowMini({
  label,
  value,
  plain,
}: {
  label: string;
  value: string;
  plain?: boolean;
}) {
  const text = plain ? value : formatSavariDateTime(value);
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right font-mono text-[10px] tabular-nums text-foreground">{text}</span>
    </div>
  );
}
