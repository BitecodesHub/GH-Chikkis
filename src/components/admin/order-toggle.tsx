"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle } from "lucide-react";
import {
  toggleOrderCompletedAction,
  togglePaymentReceivedAction,
} from "@/app/admin/orders/actions";
import { cn } from "@/lib/cn";
import type { OrderStatus, OrderType, PaymentStatus } from "@/lib/types";

interface OrderToggleProps {
  kind: "completion" | "payment";
  orderId: string;
  type: OrderType;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  canManage: boolean;
  canPay: boolean;
}

export function OrderToggle({
  kind,
  orderId,
  type,
  status,
  paymentStatus,
  canManage,
  canPay,
}: OrderToggleProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(status);
  const [optimisticPayment, setOptimisticPayment] = useOptimistic(paymentStatus);

  const cancelled = optimisticStatus === "CANCELLED";
  const isCompletion = kind === "completion";
  const active = isCompletion
    ? optimisticStatus === "COMPLETED"
    : optimisticPayment === "FULLY_PAID";
  const allowed = isCompletion ? canManage : canPay && type === "SALES";
  const disabled = cancelled || !allowed || pending;

  const label = isCompletion
    ? cancelled
      ? "Cancelled"
      : active
        ? "Completed"
        : "Pending"
    : active
      ? "Paid"
      : "Pending";

  const flip = () => {
    if (disabled) return;
    setError(null);
    const next = !active;
    startTransition(async () => {
      try {
        if (isCompletion) {
          setOptimisticStatus(next ? "COMPLETED" : "PENDING");
          const result = await toggleOrderCompletedAction(orderId, next);
          if (!result.ok) {
            setError(result.message ?? "Could not update the order.");
            return;
          }
        } else {
          setOptimisticPayment(next ? "FULLY_PAID" : "UNPAID");
          const result = await togglePaymentReceivedAction(orderId, next);
          if (!result.ok) {
            setError(result.message ?? "Could not update the payment.");
            return;
          }
        }
        router.refresh();
      } catch {
        setError("Could not confirm the update. Refresh to check the current status.");
      }
    });
  };

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={flip}
        disabled={disabled}
        aria-pressed={active}
        aria-label={
          isCompletion
            ? `Order ${active ? "completed" : "pending"} — click to mark ${active ? "pending" : "completed"}`
            : `Payment ${active ? "received" : "pending"} — click to mark ${active ? "pending" : "received"}`
        }
        title={!allowed && !cancelled ? "You do not have permission to change this" : undefined}
        className={cn(
          "pill inline-flex cursor-pointer items-center gap-1.5 border transition-colors",
          active
            ? "border-olive-deep bg-olive-deep/10 text-olive-deep"
            : cancelled
              ? "border-terracotta text-terracotta"
              : "border-brass bg-brass/10 text-brass",
          disabled && "cursor-default opacity-80",
          !disabled && "hover:shadow-sm",
        )}
      >
        {pending ? (
          <LoaderCircle aria-hidden="true" className="size-3 animate-spin" />
        ) : active ? (
          <Check aria-hidden="true" className="size-3" />
        ) : (
          <span
            aria-hidden="true"
            className={cn("size-1.5 rounded-full", cancelled ? "bg-terracotta" : "bg-brass")}
          />
        )}
        {label}
      </button>
      {error ? (
        <span role="alert" className="max-w-44 text-[0.6875rem] leading-snug text-terracotta">
          {error}
        </span>
      ) : null}
    </span>
  );
}