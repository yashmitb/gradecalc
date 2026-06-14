import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "GradeHQ — What do you need on the final?",
  description:
    "Figure out exactly what you need on the final to land the grade you want. Free, private, no sign-up.",
  // Lets iOS Safari "Add to Home Screen" launch GradeHQ full-screen with the
  // right title and a dark status bar.
  appleWebApp: {
    capable: true,
    title: "GradeHQ",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
    { media: "(prefers-color-scheme: light)", color: "#f3f4f3" },
  ],
};

// Runs before first paint so the saved theme is applied with no flash of the
// wrong colors. Kept tiny and dependency-free on purpose.
const themeScript = `(function(){try{var p=localStorage.getItem('gradehq.theme.v1');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var r=(p==='light'||p==='dark')?p:(d?'dark':'light');document.documentElement.setAttribute('data-theme',r);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh" suppressHydrationWarning>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeScript}
        </Script>
        {children}
      </body>
    </html>
  );
}
