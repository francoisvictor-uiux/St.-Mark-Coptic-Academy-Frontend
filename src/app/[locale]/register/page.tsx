import { setRequestLocale } from "next-intl/server";
import AuthCard from "@/components/auth/AuthCard";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AuthCard mode="register" />;
}
