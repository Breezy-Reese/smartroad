import { useState, useEffect } from "react";

export type ReceiptStatus = "delivered" | "failed" | "pending";
export type ReceiptChannel = 'push' | 'sms' | 'call' | 'email';

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

const now = Date.now();
const min = 60000;

const PLACEHOLDER_RECEIPTS: DeliveryReceipt[] = [
  {
    id: "rcpt-001",
    recipientName: "Jane Mwangi",
    recipientContact: "+254712345678",
    channel: "sms",
    message: "Your delivery has arrived. Please confirm receipt.",
    status: "delivered",
    sentAt: new Date(now - min * 5).toISOString(),
    deliveredAt: new Date(now - min * 4).toISOString(),
    errorReason: null,
  },
  {
    id: "rcpt-002",
    recipientName: "Peter Kamau",
    recipientContact: "peter@example.com",
    channel: "email",
    message: "Trip #512 completed. Delivery confirmed.",
    status: "delivered",
    sentAt: new Date(now - min * 30).toISOString(),
    deliveredAt: new Date(now - min * 29).toISOString(),
    errorReason: null,
  },
  {
    id: "rcpt-003",
    recipientName: "Grace Wanjiru",
    recipientContact: "+254798765432",
    channel: "call",
    message: "Package delivered successfully.",
    status: "failed",
    sentAt: new Date(now - min * 60).toISOString(),
    deliveredAt: null,
    errorReason: "Number not registered on WhatsApp",
  },
  {
    id: "rcpt-004",
    recipientName: "Brian Otieno",
    recipientContact: "+254723456789",
    channel: "push",
    message: "Your driver is 5 minutes away.",
    status: "pending",
    sentAt: new Date(now - min * 2).toISOString(),
    deliveredAt: null,
    errorReason: null,
  },
  {
    id: "rcpt-005",
    recipientName: "Aisha Odhiambo",
    recipientContact: "+254756789012",
    channel: "sms",
    message: "Emergency contact notified.",
    status: "delivered",
    sentAt: new Date(now - min * 120).toISOString(),
    deliveredAt: new Date(now - min * 119).toISOString(),
    errorReason: null,
  },
  {
    id: "rcpt-006",
    recipientName: "Mercy Njeri",
    recipientContact: "mercy@example.com",
    channel: "email",
    message: "Trip receipt for your records.",
    status: "failed",
    sentAt: new Date(now - min * 180).toISOString(),
    deliveredAt: null,
    errorReason: "Invalid email address",
  },
];

const computeStats = (receipts: DeliveryReceipt[]): ReceiptStats => ({
  total: receipts.length,
  delivered: receipts.filter((r) => r.status === "delivered").length,
  failed: receipts.filter((r) => r.status === "failed").length,
  pending: receipts.filter((r) => r.status === "pending").length,
});

export const useDeliveryReceipts = (): UseDeliveryReceiptsReturn => {
  const [receipts, setReceipts] = useState<DeliveryReceipt[]>([]);
  const [stats, setStats] = useState<ReceiptStats>({ total: 0, delivered: 0, failed: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // TODO: replace with your real API endpoint
        // const res = await fetch("/api/driver/delivery-receipts");
        // if (!res.ok) throw new Error("Failed to fetch receipts");
        // const data: DeliveryReceipt[] = await res.json();
        if (!cancelled) {
          setReceipts(PLACEHOLDER_RECEIPTS);
          setStats(computeStats(PLACEHOLDER_RECEIPTS));
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setReceipts([]);
          setStats({ total: 0, delivered: 0, failed: 0, pending: 0 });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [tick]);

  const refetch = () => setTick((t) => t + 1);

  return { receipts, stats, loading, error, refetch };
};
