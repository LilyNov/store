import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import ProductPrice from "./product-price";
import { Product } from "@/types";
import clsx from "clsx";
import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowLeftRight, Star } from "lucide-react";

// A relaxed product-like shape so we can reuse for saved cart items without full Product
export interface ProductLike
  extends Omit<Partial<Product>, "price" | "rating"> {
  productId?: string; // for cart items
  slug: string;
  name: string;
  images?: string[];
  image?: string; // fallback single image
  // Allow numeric or string price; will normalize to number where used
  price?: number | string;
  stock?: number;
  rating?: string | number;
  quantity?: number; // when coming from cart context
}

interface ProductCardProps {
  product: ProductLike;
  variant?: "default" | "compactCart" | "large";
  actions?: ReactNode; // custom action buttons (e.g., move / delete)
  fromCart?: boolean; // shortcut to indicate in-cart rendering
  loading?: boolean;
  onMove?: () => void;
  onDelete?: () => void;
}

const ProductCard = ({
  product,
  variant = "default",
  actions,
  fromCart,
  loading,
  onMove,
  onDelete,
}: ProductCardProps) => {
  const compact = variant === "compactCart";
  const large = variant === "large";
  const imageSize = compact ? 140 : large ? 360 : 300;
  const imageSrc =
    product.images?.[0] || product.image || "/images/placeholder.jpg";
  const stock = typeof product.stock === "number" ? product.stock : undefined;
  const rating = product.rating;
  const priceNum = product.price != null ? Number(product.price) : undefined;

  if (loading) {
    return (
      <Card
        className={clsx(
          "w-full animate-pulse",
          compact ? "max-w-[220px] text-xs" : "max-w-sm"
        )}
      >
        <CardHeader className={clsx(compact ? "p-2" : "p-0")}>
          <div
            className={clsx(
              "bg-muted rounded w-full",
              compact ? "h-[140px]" : "h-[300px]"
            )}
          />
        </CardHeader>
        <CardContent className={clsx("grid gap-2", compact ? "p-2" : "p-4")}>
          <div className="h-3 bg-muted rounded w-1/2" />
          <div className="h-3 bg-muted rounded w-3/4" />
          <div className="flex gap-2">
            <div className="h-3 bg-muted rounded w-16" />
            <div className="h-3 bg-muted rounded w-10" />
          </div>
          {compact && <div className="h-3 bg-muted rounded w-8" />}
          <div className="flex gap-2 mt-1">
            <div className="h-7 bg-muted rounded w-14" />
            <div className="h-7 bg-muted rounded w-10" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={clsx(
        "w-full",
        compact ? "max-w-[220px] text-xs" : large ? "max-w-md" : "max-w-sm",
        compact && "border-dashed"
      )}
    >
      <CardHeader
        className={clsx(
          "items-center",
          compact ? "p-2" : large ? "p-0" : "p-0"
        )}
      >
        <Link href={`/product/${product.slug}`} className="block">
          <Image
            priority={compact ? false : true}
            src={imageSrc}
            alt={product.name}
            className={clsx(
              "object-cover rounded",
              compact ? "aspect-square" : "aspect-square"
            )}
            height={imageSize}
            width={imageSize}
          />
        </Link>
      </CardHeader>
      <CardContent
        className={clsx("grid gap-2", compact ? "p-2" : large ? "p-5" : "p-4")}
      >
        {!compact && (
          <div className="text-xs opacity-70 flex gap-1">
            {/* {product.brand?.name && <span>{product.brand.name}</span>} */}
            {product.category?.name && (
              <span className="opacity-60">{product.category.name}</span>
            )}
          </div>
        )}
        <Link href={`/product/${product.slug}`}>
          <h2
            className={clsx(
              "font-medium line-clamp-2",
              compact ? "text-xs" : large ? "text-base" : "text-sm"
            )}
          >
            {product.name}
          </h2>
        </Link>
        <div
          className={clsx(
            "flex justify-between items-center",
            compact ? "gap-2" : "gap-4"
          )}
        >
          {/* Rating with star icons */}
          {rating != null &&
            (() => {
              const numeric =
                typeof rating === "number"
                  ? rating
                  : parseFloat(String(rating).replace(/[^0-9.]/g, ""));
              const valid = Number.isFinite(numeric) && numeric > 0;
              if (!valid) return null;
              const max = 5;
              const clamped = Math.min(max, numeric);
              const filled = Math.round(clamped); // simple rounding; could extend to half-stars
              return (
                <div
                  className={clsx(
                    "flex items-center gap-1",
                    compact ? "text-[10px]" : "text-xs"
                  )}
                  aria-label={`Rating: ${clamped.toFixed(
                    clamped % 1 === 0 ? 0 : 1
                  )} out of 5`}
                >
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: max }).map((_, i) => (
                      <Star
                        key={i}
                        className={clsx(
                          "w-3 h-3",
                          i < filled
                            ? "fill-yellow-400 stroke-yellow-500"
                            : "stroke-muted-foreground"
                        )}
                      />
                    ))}
                  </div>
                  <span>{clamped.toFixed(clamped % 1 === 0 ? 0 : 1)}</span>
                </div>
              );
            })()}
          {priceNum != null && stock !== 0 && (
            <ProductPrice
              value={priceNum}
              className={clsx(
                compact ? "text-sm" : large ? "text-3xl" : undefined
              )}
            />
          )}
          {stock === 0 && (
            <p className="text-destructive text-xs">Out of Stock</p>
          )}
        </div>
        {(fromCart || compact) && product.quantity != null && (
          <div className="text-[10px] opacity-70">
            Quantity: {product.quantity}
          </div>
        )}
        {(actions || onMove || onDelete) && (
          <div className="flex flex-wrap gap-2 mt-1">
            {actions}
            {onMove && (
              <Button
                size={compact ? "sm" : "default"}
                variant="outline"
                onClick={onMove}
              >
                <ArrowLeftRight className="w-4 h-4" />
                {!compact && <span className="ml-1">Move</span>}
              </Button>
            )}
            {onDelete && (
              <Button
                size={compact ? "sm" : "default"}
                variant="destructive"
                onClick={onDelete}
              >
                <Trash2 className="w-4 h-4" />
                {!compact && <span className="ml-1">Delete</span>}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductCard;
