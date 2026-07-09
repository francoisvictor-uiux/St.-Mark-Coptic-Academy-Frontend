import { setRequestLocale } from "next-intl/server";
import AuthShell from "@/components/auth/AuthShell";
import RegisterWizard from "@/components/auth/RegisterWizard";

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ verify?: string }>;
}) {
  const { locale } = await params;
  const { verify } = await searchParams;
  setRequestLocale(locale);
  return (
    <AuthShell wide>
      <RegisterWizard initialVerifyEmail={verify} />
    </AuthShell>
  );
}
