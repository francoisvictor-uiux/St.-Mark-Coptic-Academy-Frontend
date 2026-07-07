import Image from "next/image";
import { useTranslations, useMessages } from "next-intl";
import { Link } from "@/i18n/navigation";
import SectionHeader from "@/components/ui/SectionHeader";
import PillButton from "@/components/ui/PillButton";
import ArrowIcon from "@/components/ui/ArrowIcon";
import Reveal from "@/components/ui/Reveal";

type ArticleItem = {
  category: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  minutes: number;
  access: "public" | "members";
  image: string;
};

export default function Articles() {
  const t = useTranslations("articles");
  const messages = useMessages() as {
    articles: { items: ArticleItem[] };
  };
  const articles = messages.articles.items;

  return (
    <section id="articles" aria-labelledby="articles-label" className="bg-creamy-100 py-16 md:py-24">
      <Reveal className="mx-auto flex max-w-[1248px] flex-col gap-10 px-4 md:gap-14 md:px-8">
        <SectionHeader label={t("label")} subtitle={t("subtitle")} />

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <article key={article.title} data-reveal className="group flex flex-col gap-5">
              <Link href="/articles" className="relative block h-56 overflow-hidden rounded-card md:h-60">
                <Image
                  src={article.image}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:group-hover:scale-100"
                />
                <span className="absolute top-4 start-4 rounded-full bg-creamy-50/95 px-3.5 py-1.5 font-serif text-[13px] font-bold text-brown-500">
                  {article.category}
                </span>
                <span
                  className={`absolute top-4 end-4 rounded-full px-3.5 py-1.5 font-serif text-[13px] font-bold ${
                    article.access === "members"
                      ? "bg-brown-500/95 text-creamy-50"
                      : "bg-red-50/95 text-red-800"
                  }`}
                >
                  {t(`access.${article.access}`)}
                </span>
              </Link>

              <div className="flex flex-col gap-3 px-1">
                <p className="flex items-center gap-2 font-serif text-sm text-brown-300">
                  <span>{article.date}</span>
                  <span aria-hidden="true">·</span>
                  <span>{t("readingTime", { minutes: article.minutes })}</span>
                </p>
                <h3 className="font-serif text-xl font-bold leading-[1.5] text-brown-900 transition-colors group-hover:text-brown-500">
                  <Link href="/articles">{article.title}</Link>
                </h3>
                <p className="font-serif text-[15px] font-light leading-[1.7] text-brown-400">
                  {article.excerpt}
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <p className="flex items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className="flex size-9 items-center justify-center rounded-full bg-creamy-400 font-serif text-sm font-bold text-brown-500"
                    >
                      {article.author.slice(0, 1)}
                    </span>
                    <span className="font-serif text-sm text-brown-400">{article.author}</span>
                  </p>
                  <Link
                    href="/articles"
                    className="inline-flex items-center gap-1.5 font-serif text-sm font-bold text-brown-500 transition-colors hover:text-red-600"
                    aria-label={`${t("cardCta")}: ${article.title}`}
                  >
                    {t("cardCta")}
                    <ArrowIcon className="size-4" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="flex justify-center" data-reveal>
          <PillButton href="/articles" variant="outline">
            {t("showAll")}
          </PillButton>
        </div>
      </Reveal>
    </section>
  );
}
