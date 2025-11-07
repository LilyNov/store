// Removed JsonValue import; address now handled via Address model not inline JSON.

export interface DbUser {
  id: string;
  name: string;
  email: string;
  password: string | null;
  role: string;
  blocked: number;
  emailVerified: Date | null;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  // address removed from User model (now separate Address records). Keep optional snapshot if needed.
  // paymentMethod removed (Stripe-only)
}
