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
  paymentMethod: string | null;
  updatedAt: Date;
}
