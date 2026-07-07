import localFont from "next/font/local";
import { Archivo } from "next/font/google";

/** Stat numerals only (per Figma: Archivo Light 80px) */
export const archivo = Archivo({
  subsets: ["latin"],
  weight: ["300"],
  variable: "--font-archivo-var",
  display: "swap",
});

/** Body / UI font — Thmanyah Sans */
export const thmanyahSans = localFont({
  src: [
    { path: "../fonts/thmanyahsans-Light.woff2", weight: "300" },
    { path: "../fonts/thmanyahsans-Regular.woff2", weight: "400" },
    { path: "../fonts/thmanyahsans-Medium.woff2", weight: "500" },
    { path: "../fonts/thmanyahsans-Bold.woff2", weight: "700" },
    { path: "../fonts/thmanyahsans-Black.woff2", weight: "900" },
  ],
  variable: "--font-sans-var",
  display: "swap",
});

/** Editorial text font — Thmanyah Serif Text (eyebrows, paragraphs, buttons) */
export const thmanyahSerifText = localFont({
  src: [
    { path: "../fonts/thmanyahseriftext-Light.woff2", weight: "300" },
    { path: "../fonts/thmanyahseriftext-Regular.woff2", weight: "400" },
    { path: "../fonts/thmanyahseriftext-Medium.woff2", weight: "500" },
    { path: "../fonts/thmanyahseriftext-Bold.woff2", weight: "700" },
    { path: "../fonts/thmanyahseriftext-Black.woff2", weight: "900" },
  ],
  variable: "--font-serif-var",
  display: "swap",
});

/** Display headings — Thmanyah Serif Display */
export const thmanyahSerifDisplay = localFont({
  src: [
    { path: "../fonts/thmanyahserifdisplay-Light.woff2", weight: "300" },
    { path: "../fonts/thmanyahserifdisplay-Regular.woff2", weight: "400" },
    { path: "../fonts/thmanyahserifdisplay-Medium.woff2", weight: "500" },
    { path: "../fonts/thmanyahserifdisplay-Bold.woff2", weight: "700" },
    { path: "../fonts/thmanyahserifdisplay-Black.woff2", weight: "900" },
  ],
  variable: "--font-display-var",
  display: "swap",
});

/** Calligraphic Thulth — hero academy title only */
export const moshrefThulth = localFont({
  src: [{ path: "../fonts/AMoshrefThulth.ttf", weight: "400" }],
  variable: "--font-thulth-var",
  display: "swap",
});

