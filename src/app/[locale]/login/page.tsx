import { setRequestLocale } from "next-intl/server";
import AuthCard from "@/components/auth/AuthCard";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AuthCard mode="login" />;
}
