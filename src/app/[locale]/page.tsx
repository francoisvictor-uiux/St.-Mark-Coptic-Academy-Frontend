import { setRequestLocale } from "next-intl/server";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/sections/Hero";
import Partners from "@/components/sections/Partners";
import Vision from "@/components/sections/Vision";
import Programs from "@/components/sections/Programs";
import Theses from "@/components/sections/Theses";
import Features from "@/components/sections/Features";
import Articles from "@/components/sections/Articles";
import Testimonials from "@/components/sections/Testimonials";
import Events from "@/components/sections/Events";
import ApplyForm from "@/components/sections/ApplyForm";
import Faq from "@/components/sections/Faq";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Header />
      <main>
        <Hero />
        <Partners />
        <Vision />
        <Programs />
        <Theses />
        <Features />
        <Articles />
        <Testimonials />
        <Events />
        <ApplyForm />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
