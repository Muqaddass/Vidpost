import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignupForm } from "./SignupForm";

export const metadata = { title: "Sign up · VidPost" };

export default function SignupPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Start posting to every platform in seconds</CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          By signing up you agree to our{" "}
          <Link href="/terms-of-service" className="underline hover:text-foreground">Terms</Link>{" "}
          and{" "}
          <Link href="/privacy-policy" className="underline hover:text-foreground">Privacy Policy</Link>.
        </p>
      </CardContent>
    </Card>
  );
}
