"use client";
import { useTransition } from "react";
import { createStripeCheckoutSession } from "@/lib/actions/payment.actions";
import { Button } from "@/components/ui/button";
import { Loader } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PlaceOrderClient = () => {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  return (
    <div className="space-y-2">
      <Button
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            const res = await createStripeCheckoutSession();
            if (!res.success || !res.url) {
              toast({
                variant: "destructive",
                description: res.message || "Failed to start checkout",
              });
              return;
            }
            // Redirect to hosted Stripe Checkout
            window.location.href = res.url;
          });
        }}
      >
        {isPending ? (
          <Loader className="w-4 h-4 animate-spin" />
        ) : (
          "Pay Securely"
        )}
      </Button>
    </div>
  );
};

export default PlaceOrderClient;
