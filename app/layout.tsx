import type { Metadata, Viewport } from "next";
import {
  Geist,
  Geist_Mono,
  Chakra_Petch,
  Sacramento,
} from "next/font/google";
import "./globals.css";
import { LenisProvider } from "@/components/providers/LenisProvider";
import { CustomCursor } from "@/components/ui/CustomCursor";
import { Nav } from "@/components/ui/Nav";
import { Loader } from "@/components/ui/Loader";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
  TWITTER_HANDLE,
} from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// display face — squared-off sci-fi/HUD sans for headings + titles, to
// match the arcade / CRT theme (replaces the old serif)
const chakraPetch = Chakra_Petch({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// the handwritten signature letterforms (contact sign-off + footer handle)
const sacramento = Sacramento({
  variable: "--font-signature",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "Divyansh Agarwal",
    "full-stack engineer",
    "full-stack developer",
    "frontend engineer",
    "frontend developer",
    "backend engineer",
    "backend developer",
    "game developer",
    "game development",
    "software engineer",
    "React",
    "Next.js",
    "TypeScript",
    "Three.js",
    "WebGL",
    "Node.js",
    "Python",
    "Go",
    "Bangalore",
    "India",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "technology",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/da-favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    locale: "en_US",
    title: SITE_TITLE,
    description: "Interfaces, services, and the wires between them.",
  },
  twitter: {
    card: "summary_large_image",
    creator: TWITTER_HANDLE,
    title: SITE_TITLE,
    description: "Interfaces, services, and the wires between them.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${chakraPetch.variable} ${sacramento.variable}`}
    >
      <body className="bg-background text-foreground font-sans antialiased">
        {/* keyboard skip link — first focusable element, hidden until focused */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-3 focus:py-2 focus:rounded-md focus:bg-accent focus:text-background font-mono text-xs uppercase tracking-widest"
        >
          Skip to content
        </a>
        <LenisProvider>
          <Loader />
          <CustomCursor />
          <Nav />
          <main id="main-content" className="relative">
            {children}
          </main>
        </LenisProvider>
      </body>
    </html>
  );
}
