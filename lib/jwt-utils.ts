/**
 * Decodes a JWT token without using external libraries
 */
export function decodeJwt(token: string) {
  try {
    // JWT structure is: header.payload.signature
    // We only need the payload part
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");

    // For browser environments
    if (typeof window !== "undefined") {
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    }
    // For Node.js environments
    else {
      const jsonPayload = Buffer.from(base64, "base64").toString("utf-8");
      return JSON.parse(jsonPayload);
    }
  } catch (error) {
    console.error("Error decoding JWT:", error);
    return null;
  }
}
