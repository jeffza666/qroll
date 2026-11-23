import { LoginForm } from "@/app/(auth)/login/LoginForm";
import { getSafeRedirect } from "@/lib/safe-redirect";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    from?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <LoginForm
      initialError={Boolean(params.error)}
      redirectTo={getSafeRedirect(params.from)}
      isDevMode={process.env.BYPASS_TU_AUTH === "true"}
    />
  );
}
