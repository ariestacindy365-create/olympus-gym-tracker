import type { Metadata, Viewport } from "next";
import { Inter, Oswald } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/ui/ServiceWorkerRegister";
import { ConfirmProvider } from "@/components/ui/ConfirmProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "OLYMPUS Lifting Club",
  description: "Gym tracker for OLYMPUS Lifting Club coaches and members.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "OLYMPUS",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${oswald.variable} h-full antialiased`}
      // The inline script below sets data-theme on this element before React
      // hydrates, so the client's first paint intentionally differs from the
      // server-rendered markup (which never sets it) — without this, React
      // logs it as a hydration mismatch even though it's expected here.
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {/* Runs before the rest of the body paints, so a saved light/dark
            override applies immediately instead of flashing the system
            theme first. See ThemeToggle for what writes localStorage. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();",
          }}
        />
        <ServiceWorkerRegister />
        <ToastProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
