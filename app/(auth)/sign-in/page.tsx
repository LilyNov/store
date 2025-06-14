import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
// import { redirect } from 'next/navigation';
// import { auth } from '@/auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";
export const metadata: Metadata = {
  title: "Sign In",
};
import CredentialsSignInForm from "./credentials-signin-form";
import { auth0 } from "@/lib/auth0";

const SignIn = async () => {
  const session = await auth0.getSession();
  console.log("Session in SignIn page:", session);

  return (
    <div className="w-full max-w-md mx-auto">
      <Card>
        <CardHeader className="space-y-4">
          <Link href="/" className="flex-center">
            <Image
              priority={true}
              src="/images/logo.svg"
              width={100}
              height={100}
              alt={`${APP_NAME} logo`}
            />
          </Link>
          <CardTitle className="text-center">Sign In</CardTitle>
          <CardDescription className="text-center">
            Select a method to sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CredentialsSignInForm />
        </CardContent>
      </Card>
    </div>
  );
};

export default SignIn;
