import { setRequestLocale } from "next-intl/server";
import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <AuthShell withBrandPane>
      <LoginForm />
    </AuthShell>
  );
}
