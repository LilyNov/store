import { isRedirectError } from "next/dist/client/components/redirect-error";
import { getMyCart } from "./actions/cart.actions"; // corrected path
import { getUserId } from "./actions/user.actions";
import { getUserAddress } from "./user-service";
import { formatError } from "./utils";

export const createOrder = async () => {
  try {
    const cart = await getMyCart();
    const { userId } = await getUserId();

    if (!userId) throw new Error("User not found");

    const userAddress = await getUserAddress(userId);

    if (!cart || cart.items.length === 0) {
      return {
        success: false,
        message: "Your cart is empty",
        redirectTo: "/cart",
      };
    }
    if (!userAddress || !userAddress.shippingAddress) {
      return {
        success: false,
        message: "No shipping address",
        redirectTo: "/shipping-address",
      };
    }
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false, message: formatError(error) };
  }
};
