import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-canvas px-6 py-10">
      <SignUp signInUrl="/sign-in" />
    </main>
  );
}
