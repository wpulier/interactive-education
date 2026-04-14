import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import { Providers } from "@/components/providers";
import { UserMenu } from "@/components/user-menu";
import "./globals.css";

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const serif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Interactive Education",
  description: "Interactive lessons across subjects",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body className="font-sans bg-[var(--bg)] text-[var(--text)] antialiased">
        <Providers>
          <header className="fixed top-0 right-0 p-4 z-50">
            <UserMenu />
          </header>
          {children}
        </Providers>
      </body>
    </html>
  );
}
