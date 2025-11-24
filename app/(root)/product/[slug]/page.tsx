import { notFound } from "next/navigation";
import ProductPrice from "@/components/shared/product/product-price";
import { Card, CardContent } from "@/components/ui/card";
import { getProductBySlug } from "@/lib/actions/product.actions";
import { Badge } from "@/components/ui/badge";
import ProductImages from "@/components/shared/product/product-images";
import AddToCart from "@/components/shared/product/add-to-cart";
import { getMyCart } from "@/lib/actions/cart.actions";
import React from "react";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

const ProductDetailsPage = async ({ params }: ProductPageProps) => {
  const { slug } = await params;

  const product = await getProductBySlug(slug);
  if (!product) notFound();

  let cart = null;
  try {
    cart = await getMyCart();
  } catch (e) {
    console.error("ProductDetailsPage: failed to load cart", e);
  }

  return (
    <>
      <section>
        <div className="grid grid-cols-1 md:grid-cols-5">
          {/* Images Column */}
          <div className="col-span-2">
            {Array.isArray(product.images) && product.images.length > 0 ? (
              <ProductImages images={product.images} />
            ) : (
              <div className="min-h-[300px] flex items-center justify-center border rounded">
                <span className="text-sm text-muted-foreground">No image</span>
              </div>
            )}
          </div>

          {/* Details Column */}
          <div className="col-span-2 p-5">
            <div className="flex flex-col gap-6">
              <p>{/* {product.brand?.name} {product.category?.name} */}</p>
              <h1 className="h3-bold">{product.name}</h1>
              <p>
                {product.rating} of {product.numReviews} reviews
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <ProductPrice
                  value={Number(product.price)}
                  className="w-24 rounded-full bg-green-100 text-green-700 px-5 py-2"
                />
              </div>
            </div>
            <div className="mt-10">
              <p>Description:</p>
              <p>{product.description}</p>
            </div>
          </div>
          {/* Action Column */}
          <div>
            <Card>
              <CardContent className="p-4">
                <div className="mb-2 flex justify-between">
                  <div>Price</div>
                  <div>
                    <ProductPrice value={Number(product.price)} />
                  </div>
                </div>
                <div className="mb-2 flex justify-between">
                  <div>Status</div>
                  {product.stock > 0 ? (
                    <Badge variant="outline">In stock</Badge>
                  ) : (
                    <Badge variant="destructive">Unavailable</Badge>
                  )}
                </div>
                {product.stock > 0 && (
                  <div className=" flex-center">
                    <AddToCart
                      cart={cart}
                      item={{
                        productId: product.id,
                        name: product.name,
                        slug: product.slug,
                        price: Number(product.price),
                        quantity: 1,
                        image:
                          Array.isArray(product.images) && product.images.length
                            ? product.images[0]
                            : "/images/placeholder.jpg",
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
};

export default ProductDetailsPage;
