import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/compoenent/nav";
import Footer from "@/compoenent/footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "DataMart | Ghana's Premier Data Marketplace",
  description: "The leading platform for data resellers in Ghana to buy and sell client data securely and efficiently.",
  keywords: "data marketplace, Ghana, data resellers, buy data, sell data, client data, Ghana data market",
  openGraph: {
    title: "DataMart | Ghana's Premier Data Marketplace",
    description: "Connect with data resellers across Ghana. Buy and sell client data securely on our trusted platform.",
    url: "https://www.datamartgh.shop",
    siteName: "DataMart",
    images: [
      {
        url: "/component/datamart-logo.svg",
        width: 1200,
        height: 630,
        alt: "DataMart - Ghana's Data Marketplace",
      },
    ],
    locale: "en_GH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DataMart | Ghana's Premier Data Marketplace",
    description: "Connect with data resellers across Ghana. Buy and sell client data securely on our trusted platform.",
    images: ["/images/datamart-twitter.jpg"],
  },
  alternates: {
    canonical: "https://datamart.gh",
  },
  robots: {
    index: true,
    follow: true,
  },
  metadataBase: new URL("https://datamart.gh"),
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <Navbar />
        <main className="flex-grow">{children}</main>
        <Footer />
      </body>
    </html>
  );
}