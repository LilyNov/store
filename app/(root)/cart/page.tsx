// import { getMyCart } from "@/lib/actions/cart.actions";
import CartTable from "./cart-table";
import { getMyCartFull } from "@/lib/actions/cart.actions";

export const metadata = {
  title: "Shopping Cart",
};

const CartPage = async () => {
  const cart = await getMyCartFull();
  console.log(cart);

  return <CartTable cart={cart} />;
};

export default CartPage;
