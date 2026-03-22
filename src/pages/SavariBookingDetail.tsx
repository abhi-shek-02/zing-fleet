import { useMemo } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils-date";
import {
  buildProsCons,
  buildVerifyChecklist,
  findRowByBookingId,
  headlineAnalysis,
  listAvgRpKm,
  parseBooking,
  savariPick,
  type ParsedBooking,
} from "@/lib/savariBooking";
import { LoadingSpinner, ErrorState } from "@/components/LoadingState";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function str(v: unknown): string {
  if (v == null || v === "") return "—";
  return String(v);
}

export default function SavariBookingDetail() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { row?: Record<string, unknown> } | undefined;

  const q = useQuery({
    queryKey: ["savaari", "broadcasts"],
    queryFn: () => api.getSavaariBroadcasts({ booking_id: "0" }),
  });

  const items = q.data?.items ?? [];

  const row = useMemo(() => {
    if (state?.row && bookingId) {
      const id = str(savariPick(state.row, "bookingId", "booking_id"));
      if (id === bookingId) return state.row;
    }
    if (!bookingId) return undefined;
    return findRowByBookingId(items as Record<string, unknown>[], bookingId);
  }, [state?.row, items, bookingId]);

  const parsed = useMemo(() => (row ? parseBooking(row) : null), [row]);

  const listAvg = useMemo(() => {
    const parsedList = (items as Record<string, unknown>[]).map(parseBooking);
    return listAvgRpKm(parsedList);
  }, [items]);

  const nextBestEarn = useMemo(() => {
    if (!parsed) return 0;
    const parsedList = (items as Record<string, unknown>[]).map(parseBooking);
    const others = parsedList.filter((p) => p.bookingId !== parsed.bookingId);
    return others.reduce((m, p) => Math.max(m, p.vendorCost), 0);
  }, [items, parsed]);

  const prosCons = useMemo(
    () => (parsed ? buildProsCons(parsed, listAvg, nextBestEarn) : []),
    [parsed, listAvg, nextBestEarn],
  );

  const verify = useMemo(() => (parsed ? buildVerifyChecklist(parsed) : []), [parsed]);

  const analysis = useMemo(() => (parsed ? headlineAnalysis(parsed) : null), [parsed]);

  if (q.isLoading && !row) {
    return (
      <div className="mx-auto min-h-screen max-w-lg px-4 py-6">
        <LoadingSpinner label="Loading booking…" />
      </div>
    );
  }

  if (q.isError && !row) {
    return (
      <div className="mx-auto min-h-screen max-w-lg px-4 py-6">
        <ErrorState
          message={q.error instanceof Error ? q.error.message : "Failed to load"}
          onRetry={() => void q.refetch()}
        />
      </div>
    );
  }

  if (!parsed || !bookingId) {
    return (
      <div className="mx-auto min-h-screen max-w-lg px-4 py-8">
        <p className="text-sm text-muted-foreground">Booking not found.</p>
        <Button type="button" variant="link" className="mt-2 px-0" onClick={() => navigate("/savari")}>
          Back to list
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 py-4 pb-10">
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" className="shrink-0" asChild>
          <Link to="/savari" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Booking #{parsed.bookingId} · analysis
          </p>
          <h1 className="text-lg font-semibold leading-snug">{analysis?.title}</h1>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-amber-200/40 bg-amber-50/90 p-4 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
        <p className="text-sm leading-relaxed">{analysis?.body}</p>
        <p className="mt-2 text-[11px] text-amber-900/80 dark:text-amber-200/80">
          Rule-based summary from your feed — no AI. Numbers may omit fields the API does not send.
        </p>
      </div>

      <ExpiryBlock p={parsed} />
      <TripGlance p={parsed} />
      <KeyNumbers p={parsed} listAvg={listAvg} />
      <TripLogistics row={parsed.row} p={parsed} />
      <CompareSection p={parsed} listAvg={listAvg} nextBest={nextBestEarn} />
      <ProsCons items={prosCons} />
      <VerifyCard rows={verify} />
    </div>
  );
}

function ExpiryBlock({ p }: { p: ParsedBooking }) {
  const tone =
    p.timerTone === "red"
      ? "text-red-500"
      : p.timerTone === "amber"
        ? "text-amber-500"
        : "text-emerald-500";
  const label =
    p.hoursLeft == null
      ? str(savariPick(p.row, "autoCancelAt", "auto_cancel_at")) || "—"
      : p.hoursLeft < 1
        ? `${Math.round(p.hoursLeft * 60)} min left`
        : `${p.hoursLeft.toFixed(1)}h left`;
  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm">
      <span className="text-muted-foreground">Expires</span>
      <span className={cn("font-medium tabular-nums", tone)}>{label}</span>
    </div>
  );
}

function TripGlance({ p }: { p: ParsedBooking }) {
  return (
    <div className="mb-4 rounded-xl border bg-card p-4">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Trip at a glance
      </p>
      <div className="flex items-start justify-between gap-2 text-sm">
        <div className="min-w-0">
          <p className="font-semibold leading-tight">{p.pickCity || "—"}</p>
          <p className="text-[10px] text-muted-foreground">Pickup</p>
        </div>
        <div className="flex flex-1 flex-col items-center px-1">
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {p.packageKms > 0 ? `${Math.round(p.packageKms)} km` : "—"}
          </span>
          <div className="my-1 h-px w-full bg-border" />
        </div>
        <div className="min-w-0 text-right">
          <p className="font-semibold leading-tight">{p.dropCity || "—"}</p>
          <p className="text-[10px] text-muted-foreground">Drop</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{p.tripTypeName}</p>
    </div>
  );
}

function KeyNumbers({ p, listAvg }: { p: ParsedBooking; listAvg: number }) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
      <NumCard label="Your earnings" value={formatCurrency(p.vendorCost)} sub="vendor payout" tone="good" />
      <NumCard
        label="₹ per km"
        value={p.packageKms > 0 ? p.rpKm.toFixed(1) : "—"}
        sub={listAvg > 0 ? `vs list avg ${listAvg.toFixed(1)}` : undefined}
        tone="good"
      />
      <NumCard
        label="Cash risk"
        value={`${p.cashRiskPct.toFixed(0)}%`}
        sub={p.cashToCollect > 0 ? formatCurrency(p.cashToCollect) + " to collect" : "None"}
        tone={p.cashRiskPct >= 50 ? "bad" : "ok"}
      />
      <NumCard label="Customer total" value={formatCurrency(p.totalAmt)} sub="gross" tone="neutral" />
      <NumCard label="Payment" value={p.paymentLabel} sub={p.isAdvance ? "Partial / advance" : undefined} tone="warn" />
    </div>
  );
}

function NumCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: "good" | "bad" | "ok" | "neutral" | "warn";
}) {
  const c =
    tone === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "bad"
        ? "text-red-500"
        : tone === "warn"
          ? "text-amber-600 dark:text-amber-400"
          : "text-foreground";
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-semibold tabular-nums", c)}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function TripLogistics({ row, p }: { row: Record<string, unknown>; p: ParsedBooking }) {
  const toll = str(savariPick(row, "tollIncluded", "toll_included", "tollStatus"));
  const bookedOn = str(savariPick(row, "bookedOn", "booked_on", "createdAt", "created_at"));
  const dur = p.packageKms > 0 ? `~${Math.round(p.packageKms / 65)}–${Math.round(p.packageKms / 55)} hrs driving (indicative)` : "—";

  return (
    <div className="mb-6 rounded-xl border bg-card p-4">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Trip logistics
      </p>
      <dl className="space-y-2 text-sm">
        <RowD label="Start" value={p.pickupTimeLabel || "—"} />
        <RowD label="Trip type" value={p.tripTypeName || "—"} />
        <RowD label="Distance" value={p.packageKms > 0 ? `${Math.round(p.packageKms)} km` : "—"} />
        <RowD label="Duration (indicative)" value={dur} />
        <RowD label="Car required" value={p.carType || "—"} />
        <RowD label="Night allowance" value={p.nightAllowance > 0 ? formatCurrency(p.nightAllowance) : "—"} />
        <RowD label="Toll / state tax" value={toll !== "—" ? toll : "Check fare terms"} />
        <RowD label="Booked on" value={bookedOn} />
        <RowD label="Surge" value={p.isSurged ? "Flagged / high demand" : "None"} />
      </dl>
    </div>
  );
}

function RowD({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function CompareSection({
  p,
  listAvg,
  nextBest,
}: {
  p: ParsedBooking;
  listAvg: number;
  nextBest: number;
}) {
  return (
    <div className="mb-6">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        How this compares to your other bookings
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
          <p className="text-[10px] text-muted-foreground">This booking</p>
          <p className="text-lg font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
            ₹{p.rpKm.toFixed(1)}/km
          </p>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-emerald-900/20">
            <div className="h-full w-full bg-emerald-500" />
          </div>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-[10px] text-muted-foreground">List average</p>
          <p className="text-lg font-semibold tabular-nums">₹{listAvg.toFixed(1)}/km</p>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-muted-foreground/40"
              style={{ width: `${Math.min(100, listAvg > 0 ? (listAvg / Math.max(p.rpKm, listAvg)) * 100 : 50)}%` }}
            />
          </div>
        </div>
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
          <p className="text-[10px] text-muted-foreground">Gross earnings</p>
          <p className="text-lg font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
            {formatCurrency(p.vendorCost)}
          </p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-[10px] text-muted-foreground">Next best (open)</p>
          <p className="text-lg font-semibold tabular-nums">{formatCurrency(nextBest)}</p>
        </div>
      </div>
    </div>
  );
}

function ProsCons({ items }: { items: { kind: string; text: string }[] }) {
  return (
    <div className="mb-6">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Pros and cons
      </p>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li
            key={i}
            className={cn(
              "rounded-lg border px-3 py-2 text-sm",
              it.kind === "pro" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100",
              it.kind === "con" && "border-red-500/30 bg-red-500/10 text-red-950 dark:text-red-100",
              it.kind === "neutral" && "border-border bg-muted/20 text-foreground",
            )}
          >
            {it.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

function VerifyCard({
  rows,
}: {
  rows: { label: string; hint: string; tone: "warn" | "risk" | "ok" }[];
}) {
  return (
    <div className="rounded-xl border bg-muted/20 p-4">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        What to verify before accepting
      </p>
      <ol className="space-y-3">
        {rows.map((r, i) => (
          <li key={i} className="flex items-start justify-between gap-3 text-sm">
            <span className="text-muted-foreground">
              {i + 1}. {r.label}
            </span>
            <span
              className={cn(
                "shrink-0 text-right font-medium",
                r.tone === "risk" && "text-red-500",
                r.tone === "warn" && "text-amber-500",
                r.tone === "ok" && "text-emerald-500",
              )}
            >
              {r.hint}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
