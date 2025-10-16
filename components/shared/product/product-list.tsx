import { Product } from "@/types";
import ProductCard, { ProductLike } from "./product-card";
import { ReactNode } from "react";

const ProductList = ({
  data,
  title,
  limit,
  variant,
  renderActions,
  loading,
  skeletonCount,
  onMove,
  onDelete,
}: {
  data: (Product | ProductLike)[];
  title?: string;
  limit?: number;
  variant?: "default" | "compactCart" | "large";
  renderActions?: (p: ProductLike) => ReactNode;
  loading?: boolean;
  skeletonCount?: number;
  onMove?: (p: ProductLike) => void;
  onDelete?: (p: ProductLike) => void;
}) => {
  const limitedData = limit ? data.slice(0, limit) : data;

  return (
    <div className="my-10">
      <h2 className="h2-bold mb-4">{title}</h2>
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: skeletonCount ?? 4 }).map((_, i) => (
            <ProductCard
              key={i}
              product={{ slug: `loading-${i}`, name: "Loading" }}
              variant={variant}
              loading
            />
          ))}
        </div>
      ) : limitedData.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {limitedData.map((product: ProductLike) => (
            <ProductCard
              key={product.slug}
              product={product}
              variant={variant}
              fromCart={variant === "compactCart"}
              actions={renderActions?.(product)}
              onMove={onMove ? () => onMove(product) : undefined}
              onDelete={onDelete ? () => onDelete(product) : undefined}
            />
          ))}
        </div>
      ) : (
        <div>
          <p>No product found</p>
        </div>
      )}
    </div>
  );
};

export default ProductList;
