"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import SectionHeader from "@/components/ui/SectionHeader";
import Reveal from "@/components/ui/Reveal";
import CircularGallery, { type GalleryItem } from "@/components/ui/CircularGallery";

const IMAGES = [
  "/images/gallery/gallery-1.webp",
  "/images/gallery/gallery-2.jpeg",
  "/images/gallery/gallery-3.jpeg",
  "/images/gallery/gallery-4.jpg",
  "/images/gallery/gallery-5.jpg",
  "/images/gallery/gallery-6.jpg",
  "/images/gallery/gallery-7.webp",
  "/images/gallery/gallery-8.webp",
];

/** Photo gallery — bendable WebGL carousel, drag or scroll to explore. */
export default function Gallery({ images, labels }: { images?: { image: string; text: string }[]; labels?: { label?: string; subtitle?: string } }) {
  const t = useTranslations("gallery");

  const items: GalleryItem[] = useMemo(
    () => (images && images.length > 0 ? images : IMAGES.map((image) => ({ image, text: "" }))),
    [images],
  );

  return (
    <section id="gallery" className="overflow-hidden py-16 md:py-24">
      <Reveal>
        <SectionHeader label={labels?.label || t("title")} subtitle={labels?.subtitle || t("subtitle")} />
      </Reveal>
      <div className="relative mt-10 h-[560px] md:mt-14 md:h-[780px]">
        <CircularGallery items={items} bend={3} borderRadius={0.05} scrollSpeed={2} scrollEase={0.05} />
      </div>
    </section>
  );
}
