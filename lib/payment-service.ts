import { prisma } from "@/db/prisma";
import { formatNumberWithDecimal } from "./utils";
import type { Prisma } from "@prisma/client";

interface CreatePaymentParams {
  userId?: string | null;
  sessionCartId?: string | null;
  items: Prisma.JsonValue; // raw cart items snapshot (Json serializable)
  amount: number; // in major units (e.g., 49.99)
  currency?: string; // default usd
  stripePaymentIntentId?: string | null;
}

export async function createPaymentRecord(params: CreatePaymentParams) {
  const {
    userId = null,
    sessionCartId = null,
    items,
    amount,
    currency = "usd",
    stripePaymentIntentId = null,
  } = params;

  return prisma.payment.create({
    data: {
      userId: userId || null,
      sessionCartId: sessionCartId || null,
      items: items as Prisma.InputJsonValue,
      amount: amount, // Prisma Decimal handled via number here
      currency,
      stripePaymentIntentId,
      status: "pending",
    },
  });
}

export async function markPaymentSucceeded({
  stripePaymentIntentId,
  stripeChargeId,
  amount,
  currency,
  receiptUrl,
}: {
  stripePaymentIntentId: string;
  stripeChargeId?: string | null;
  amount: number;
  currency: string;
  receiptUrl?: string | null;
}) {
  return prisma.payment.update({
    where: { stripePaymentIntentId },
    data: {
      status: "succeeded",
      paidAt: new Date(),
      stripeChargeId: stripeChargeId || null,
      amount,
      currency,
      receiptUrl: receiptUrl || null,
    },
  });
}

export async function markPaymentFailed({
  stripePaymentIntentId,
  reason,
}: {
  stripePaymentIntentId: string;
  reason?: string;
}) {
  return prisma.payment.update({
    where: { stripePaymentIntentId },
    data: {
      status: reason ? `failed:${reason}` : "failed",
    },
  });
}

export function formatPaymentAmount(amount: number) {
  return formatNumberWithDecimal(amount);
}
