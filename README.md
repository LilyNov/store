This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Prisma

npx prisma generate

npx prisma studio

# Manage page

How the User Management Page Works
This page allows you to view and manage all users in the application, with a special focus on blocking/unblocking them. Here's how it works in simple terms:

Main Features
User List Display: Shows a table with all users from the database, including:

Profile image (or initial if no image)
Name
Email
Role (admin or user) with color coding
Join date
Blocking status with a toggle switch
User Blocking System:

Each user has a toggle switch in the "Blocked" column
Gray switch = User is NOT blocked (can use the system)
Red switch = User IS blocked (can't access the system)
When you click the switch, it instantly changes color and updates the database
How It Works Behind the Scenes
Data Loading:

When the page loads, it fetches all users from the Prisma database
Shows a spinning loader while waiting for data
Blocking/Unblocking Process:

When you click a toggle switch:
The switch shows a loading state (becomes semi-transparent)
The code immediately updates the UI (optimistic update)
In the background, it calls toggleUserBlocked() to update the database
This changes the user's blocked field from 0 to 1 (or vice versa)
The page refreshes to show the most current data
Error Handling:

If something goes wrong, an error message appears at the top
The error automatically disappears after 3 seconds
Importance of User Blocking
The blocking feature is crucial for managing problematic users:

Security: You can quickly disable access for suspicious accounts
Moderation: Control who can use the platform
Visual Clarity: The red/gray toggle makes it immediately clear who is blocked
Immediate Effect: Changes take effect right away in both the UI and database
Database Integration: The blocked status (0 or 1) is stored in the Prisma database
The system is designed to be quick and intuitive - one click toggles a user's access to the platform, with clear visual feedback about their current status.
