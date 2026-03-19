import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// ─── Generic error handler ─────────────────────────────
function useErrorToast() {
  const { toast } = useToast();
  return (error: unknown) => {
    const msg = error instanceof Error ? error.message : "Something went wrong";
    toast({ title: "Error", description: msg, variant: "destructive" });
  };
}

// ─── Queries ────────────────────────────────────────────

export function useDrivers() {
  return useQuery({ queryKey: ["drivers"], queryFn: api.getDrivers });
}

export function useDriver(id: string) {
  return useQuery({ queryKey: ["drivers", id], queryFn: () => api.getDriver(id), enabled: !!id });
}

export function useCars() {
  return useQuery({ queryKey: ["cars"], queryFn: api.getCars });
}

export function useCashEntries(params?: { driver_id?: string; week_start?: string }) {
  return useQuery({
    queryKey: ["cash", params],
    queryFn: () => api.getCashEntries(params),
    enabled: !!params?.driver_id || !params,
  });
}

export function useVendorEntries(params?: { driver_id?: string; week_start?: string }) {
  return useQuery({
    queryKey: ["vendor", params],
    queryFn: () => api.getVendorEntries(params),
    enabled: !!params?.driver_id || !params,
  });
}

export function useFuelEntries(params?: { driver_id?: string; week_start?: string; car_id?: string }) {
  return useQuery({
    queryKey: ["fuel", params],
    queryFn: () => api.getFuelEntries(params),
    enabled: !!params?.driver_id || !!params?.car_id || !params,
  });
}

export function useOtherCosts(params?: { driver_id?: string; week_start?: string }) {
  return useQuery({
    queryKey: ["otherCosts", params],
    queryFn: () => api.getOtherCosts(params),
    enabled: !!params?.driver_id || !params,
  });
}

export function useOtherEarnings(params?: { driver_id?: string; week_start?: string }) {
  return useQuery({
    queryKey: ["otherEarnings", params],
    queryFn: () => api.getOtherEarnings(params),
    enabled: !!params?.driver_id || !params,
  });
}

export function useSettlements(params?: { driver_id?: string; week_start?: string }) {
  return useQuery({
    queryKey: ["settlements", params],
    queryFn: () => api.getSettlements(params),
    enabled: !!params?.driver_id || !params,
  });
}

export function useCarCosts(params?: { car_id?: string }) {
  return useQuery({
    queryKey: ["carCosts", params],
    queryFn: () => api.getCarCosts(params),
  });
}

export function useCarDocs(params?: { car_id?: string }) {
  return useQuery({
    queryKey: ["carDocs", params],
    queryFn: () => api.getCarDocs(params),
  });
}

export function useSettings() {
  return useQuery({ queryKey: ["settings"], queryFn: api.getSettings });
}

// ─── All entries (no filter — for analytics/dashboard) ──

export function useAllCash() {
  return useQuery({ queryKey: ["cash", "all"], queryFn: () => api.getCashEntries() });
}
export function useAllVendor() {
  return useQuery({ queryKey: ["vendor", "all"], queryFn: () => api.getVendorEntries() });
}
export function useAllFuel() {
  return useQuery({ queryKey: ["fuel", "all"], queryFn: () => api.getFuelEntries() });
}
export function useAllOtherCosts() {
  return useQuery({ queryKey: ["otherCosts", "all"], queryFn: () => api.getOtherCosts() });
}
export function useAllOtherEarnings() {
  return useQuery({ queryKey: ["otherEarnings", "all"], queryFn: () => api.getOtherEarnings() });
}
export function useAllSettlements() {
  return useQuery({ queryKey: ["settlements", "all"], queryFn: () => api.getSettlements() });
}
export function useAllCarCosts() {
  return useQuery({ queryKey: ["carCosts", "all"], queryFn: () => api.getCarCosts() });
}

// ─── Mutations ──────────────────────────────────────────

export function useCreateDriver() {
  const qc = useQueryClient();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.createDriver(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["drivers"] }),
    onError,
  });
}

export function useUpdateDriver() {
  const qc = useQueryClient();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: ({ id, ...data }: Record<string, unknown> & { id: string }) => api.updateDriver(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["drivers"] }),
    onError,
  });
}

export function useCreateCar() {
  const qc = useQueryClient();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.createCar(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cars"] }),
    onError,
  });
}

export function useUpdateCar() {
  const qc = useQueryClient();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: ({ id, ...data }: Record<string, unknown> & { id: string }) => api.updateCar(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cars"] }),
    onError,
  });
}

export function useCreateCashEntry() {
  const qc = useQueryClient();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.createCashEntry(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cash"] }),
    onError,
  });
}

export function useDeleteCashEntry() {
  const qc = useQueryClient();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (id: string) => api.deleteCashEntry(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cash"] }),
    onError,
  });
}

export function useCreateVendorEntry() {
  const qc = useQueryClient();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.createVendorEntry(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendor"] }),
    onError,
  });
}

export function useDeleteVendorEntry() {
  const qc = useQueryClient();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (id: string) => api.deleteVendorEntry(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendor"] }),
    onError,
  });
}

export function useCreateFuelEntry() {
  const qc = useQueryClient();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.createFuelEntry(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fuel"] }),
    onError,
  });
}

export function useDeleteFuelEntry() {
  const qc = useQueryClient();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (id: string) => api.deleteFuelEntry(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fuel"] }),
    onError,
  });
}

export function useCreateOtherCost() {
  const qc = useQueryClient();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.createOtherCost(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["otherCosts"] }),
    onError,
  });
}

export function useDeleteOtherCost() {
  const qc = useQueryClient();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (id: string) => api.deleteOtherCost(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["otherCosts"] }),
    onError,
  });
}

export function useCreateOtherEarning() {
  const qc = useQueryClient();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.createOtherEarning(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["otherEarnings"] }),
    onError,
  });
}

export function useDeleteOtherEarning() {
  const qc = useQueryClient();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (id: string) => api.deleteOtherEarning(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["otherEarnings"] }),
    onError,
  });
}

export function useCreateSettlement() {
  const qc = useQueryClient();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.createSettlement(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settlements"] }),
    onError,
  });
}

export function useDeleteSettlement() {
  const qc = useQueryClient();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (id: string) => api.deleteSettlement(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settlements"] }),
    onError,
  });
}

export function useCreateCarCost() {
  const qc = useQueryClient();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.createCarCost(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["carCosts"] }),
    onError,
  });
}

export function useCreateCarDoc() {
  const qc = useQueryClient();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.createCarDoc(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["carDocs"] }),
    onError,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.updateSettings(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
    onError,
  });
}
