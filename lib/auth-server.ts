import { getSession } from "@auth0/nextjs-auth0";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getServerUser() {
  const session = await getSession();
  if (!session?.user) return null;

  try {
    const user = await prisma.user.findFirst({
      where: {
        account: {
          some: {
            provider: "auth0",
            providerAccountId: session.user.sub,
          },
        },
      },
    });

    return user;
  } catch (error) {
    console.error("Error fetching server user:", error);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}
