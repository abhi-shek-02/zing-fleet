import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils-date";
import { LoadingSpinner, ErrorState, EmptyState } from "@/components/LoadingState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function str(v: unknown): string {
  if (v == null || v === "") return "—";
  return String(v);
}

function money(v: unknown): string {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return formatCurrency(n);
}

/** Supports camelCase (API client) and raw snake_case keys. */
function pick(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (k in row && row[k] != null) return row[k];
  }
  return undefined;
}

export default function SavariBroadcastsPage() {
  const q = useQuery({
    queryKey: ["savaari", "broadcasts"],
    queryFn: () => api.getSavaariBroadcasts({ booking_id: "0" }),
  });

  const items = q.data?.items ?? [];

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 py-4 pb-8">
      <div className="mb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="shrink-0" asChild>
          <Link to="/login" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight">Savaari — new business</h1>
          <p className="text-xs text-muted-foreground">Broadcast list from vendor feed</p>
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
          icon={<RefreshCw className="h-8 w-8 text-muted-foreground/40 mx-auto" />}
        />
      )}

      {!q.isLoading && !q.isError && items.length > 0 && (
        <div className="space-y-3">
          {items.map((raw, i) => {
            const row = raw as Record<string, unknown>;
            const bookingId = str(pick(row, "bookingId", "booking_id"));
            const paymentStatus = str(pick(row, "paymentStatus", "payment_status"));
            const tripTypeName = str(pick(row, "tripTypeName", "trip_type_name"));
            const carType = str(pick(row, "carType", "car_type"));
            const totalAmt = money(pick(row, "totalAmt", "total_amt"));
            const cashToCollect = money(pick(row, "cashtocollect", "cashToCollect"));
            const vendorCost = money(pick(row, "vendorCost", "vendor_cost"));
            const pickCity = str(pick(row, "pickCity", "pick_city"));
            const pickLoc = str(pick(row, "pickLoc", "pick_loc"));
            const pickupTime = str(pick(row, "pickupTime", "pickup_time"));
            const autoCancelAt = str(pick(row, "autoCancelAt", "auto_cancel_at"));
            const s1 = str(pick(row, "step1At", "step1_at"));
            const s2 = str(pick(row, "step2At", "step2_at"));
            const s3 = str(pick(row, "step3At", "step3_at"));

            return (
              <Card key={`${bookingId}-${i}`} className="overflow-hidden">
                <CardHeader className="space-y-1 p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold leading-tight">Booking #{bookingId}</p>
                    <span
                      className={cn(
                        "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium",
                        paymentStatus.toLowerCase().includes("paid")
                          ? "bg-success/15 text-success"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {paymentStatus}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{tripTypeName}</p>
                </CardHeader>
                <CardContent className="space-y-2 p-4 pt-0 text-xs">
                  <Row label="Car" value={carType} />
                  <Row label="Total" value={totalAmt} mono />
                  <Row label="Cash to collect" value={cashToCollect} mono />
                  <Row label="Vendor cost" value={vendorCost} mono />
                  <Row label="Pickup time" value={pickupTime} />
                  <Row label="Pick city" value={pickCity} />
                  <Row label="Pick location" value={pickLoc} multiline />
                  <Row label="Auto cancel at" value={autoCancelAt} />
                  <div className="grid grid-cols-3 gap-1 pt-1 text-[10px] text-muted-foreground">
                    <div>
                      <p className="font-medium text-foreground/80">Step 1</p>
                      <p className="tabular-nums">{s1}</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground/80">Step 2</p>
                      <p className="tabular-nums">{s2}</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground/80">Step 3</p>
                      <p className="tabular-nums">{s3}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  multiline,
}: {
  label: string;
  value: string;
  mono?: boolean;
  multiline?: boolean;
}) {
  return (
    <div className="flex gap-2 justify-between">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span
        className={cn(
          "text-right min-w-0",
          mono && "tabular-nums font-medium",
          multiline && "whitespace-pre-wrap break-words",
        )}
      >
        {value}
      </span>
    </div>
  );
}
