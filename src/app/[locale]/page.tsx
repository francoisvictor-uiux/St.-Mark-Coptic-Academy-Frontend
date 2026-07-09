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
import Gallery from "@/components/sections/Gallery";
import Events from "@/components/sections/Events";
import ApplyForm from "@/components/sections/ApplyForm";
import Faq from "@/components/sections/Faq";
import {
  getHomeData,
  getPublicFaqs,
  getPublishedArticles,
  getPublishedEvents,
  mapHome,
  toSectionArticles,
  toSectionEvents,
  toSectionFaqs,
} from "@/lib/public-content";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Real CMS content; every section falls back to designed placeholders while empty.
  const [articles, events, faqs, home] = await Promise.all([
    getPublishedArticles(),
    getPublishedEvents("upcoming"),
    getPublicFaqs(),
    getHomeData(),
  ]);
  const cms = mapHome(home, locale);

  return (
    <>
      <Header />
      <main>
        <Hero overrides={cms.hero} />
        <Partners items={cms.partners.items} label={cms.partners.label} />
        <Vision data={cms.vision} />
        <Programs items={cms.programs.items} labels={cms.programs.labels} />
        <Theses items={cms.theses.items} labels={cms.theses.labels} />
        <Features items={cms.features.items} labels={cms.features.labels} />
        <Articles items={toSectionArticles(articles, locale)} />
        <Testimonials items={cms.testimonials.items} labels={cms.testimonials.labels} />
        <Gallery images={cms.gallery.images} labels={cms.gallery.labels} />
        <Events items={toSectionEvents(events, locale)} />
        <ApplyForm labels={cms.apply.labels} programOptions={cms.apply.programOptions} />
        <Faq items={toSectionFaqs(faqs, locale)} />
      </main>
      <Footer />
    </>
  );
}
