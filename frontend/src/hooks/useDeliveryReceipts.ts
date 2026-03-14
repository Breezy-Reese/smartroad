import { useState, useEffect } from "react";
import { notificationService } from "../services/api/notification.service";

export type ReceiptStatus  = "delivered" | "failed" | "pending";
export type ReceiptChannel = "push" | "sms" | "call" | "email";

export interface DeliveryReceipt {
  id: string;
  recipientName: string;
  recipientContact: string;
  channel: ReceiptChannel;
  message: string;
  status: ReceiptStatus;
  sentAt: string;
  deliveredAt: string | null;
  errorReason: string | null;
}

export interface ReceiptStats {
  total: number;
  delivered: number;
  failed: number;
  pending: number;
}

interface UseDeliveryReceiptsReturn {
  receipts: DeliveryReceipt[];
  stats: ReceiptStats;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const EMPTY_STATS: ReceiptStats = { total: 0, delivered: 0, failed: 0, pending: 0 };

const computeStats = (receipts: DeliveryReceipt[]): ReceiptStats => ({
  total:     receipts.length,
  delivered: receipts.filter((r) => r.status === "delivered").length,
  failed:    receipts.filter((r) => r.status === "failed").length,
  pending:   receipts.filter((r) => r.status === "pending").length,
});

export const useDeliveryReceipts = (): UseDeliveryReceiptsReturn => {
  const [receipts, setReceipts] = useState<DeliveryReceipt[]>([]);
  const [stats, setStats]       = useState<ReceiptStats>(EMPTY_STATS);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [tick, setTick]         = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // notificationService.getReceipts() hits GET /notifications/receipts
        const data = (await notificationService.getReceipts()) as unknown as DeliveryReceipt[];

        if (!cancelled) {
          setReceipts(data);
          setStats(computeStats(data));
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load delivery receipts");
          setReceipts([]);
          setStats(EMPTY_STATS);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const refetch = () => setTick((t) => t + 1);

  return { receipts, stats, loading, error, refetch };
};
