import { getSession } from "@auth0/nextjs-auth0";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { auth0Id, email, name, image } = await request.json();

    // Check if user exists by email first, then by auth0Id
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          {
            account: {
              some: {
                provider: "auth0",
                providerAccountId: auth0Id,
              },
            },
          },
        ],
      },
      include: {
        account: true,
      },
    });

    let user;

    if (existingUser) {
      // Update existing user
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: name || existingUser.name,
          image: image || existingUser.image,
        },
      });

      // Create account record if doesn't exist
      const hasAuth0Account = existingUser.account.some(
        (acc) => acc.provider === "auth0" && acc.providerAccountId === auth0Id
      );

      if (!hasAuth0Account) {
        await prisma.account.create({
          data: {
            userId: user.id,
            type: "oauth",
            provider: "auth0",
            providerAccountId: auth0Id,
          },
        });
      }
    } else {
      // Create new user with account
      user = await prisma.user.create({
        data: {
          name: name || "NO_NAME",
          email: email,
          image: image,
          account: {
            create: {
              type: "oauth",
              provider: "auth0",
              providerAccountId: auth0Id,
            },
          },
        },
      });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("User sync error:", error);
    return NextResponse.json({ error: "Failed to sync user" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
