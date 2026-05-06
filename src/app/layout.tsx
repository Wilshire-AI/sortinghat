import type { Metadata } from "next";
import { Instrument_Serif, Inter } from "next/font/google";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://sortinghat.wilshireai.com";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "Sorting Hat. The New York that fits you.",
  description:
    "A short quiz that matches you to NYC neighborhoods based on who you are, not what you can afford.",
  openGraph: {
    title: "Sorting Hat",
    description: "Find the NYC neighborhood that fits who you are.",
    type: "website",
    url: APP_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Sorting Hat",
    description: "Find the NYC neighborhood that fits who you are.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${instrumentSerif.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
