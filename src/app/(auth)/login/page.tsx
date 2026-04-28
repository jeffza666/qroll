import { LoginForm } from "@/app/(auth)/login/LoginForm";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    from?: string;
  }>;
};

function getSafeRedirect(path?: string) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/";
  if (path.startsWith("/login") || path.startsWith("/api/auth")) return "/";
  return path;
}

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
