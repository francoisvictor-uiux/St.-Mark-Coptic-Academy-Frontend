import { setRequestLocale } from "next-intl/server";
import AuthShell from "@/components/auth/AuthShell";
import ForgotPasswordFlow from "@/components/auth/ForgotPasswordFlow";

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <AuthShell>
      <ForgotPasswordFlow />
    </AuthShell>
  );
}
