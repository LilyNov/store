import { JsonValue } from "@prisma/client/runtime/library";

export interface DbUser {
  name: string;
  id: string;
  createdAt: Date;
  email: string;
  password: string | null;
  role: string;
  blocked: number;
  emailVerified: Date | null;
  image: string | null;
  address: JsonValue;
  updatedAt: Date;
}

export interface PaymentRecord {
  id: string;
  userId: string | null;
  sessionCartId: string | null;
  items: unknown; // Json snapshot from Prisma
  amount: string; // formatted string when exposed to UI
  currency: string;
  stripePaymentIntentId: string | null;
  stripeChargeId: string | null;
  status: string; // pending | succeeded | failed | canceled
  receiptUrl: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
