import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { LenisProvider } from "@/components/providers/LenisProvider";
import { CustomCursor } from "@/components/ui/CustomCursor";
import { Nav } from "@/components/ui/Nav";
import { Loader } from "@/components/ui/Loader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://divyansh.dev"),
  title: {
    default: "Divyansh Agarwal · Full-stack engineer",
    template: "%s · Divyansh Agarwal",
  },
  description:
    "Divyansh Agarwal, full-stack engineer. Interfaces, services, and the wires between them.",
  openGraph: {
    title: "Divyansh Agarwal · Full-stack engineer",
    description:
      "Interfaces, services, and the wires between them.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Divyansh Agarwal · Full-stack engineer",
    description:
      "Interfaces, services, and the wires between them.",
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
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable}`}
    >
      <body className="bg-background text-foreground font-sans antialiased">
        <LenisProvider>
          <Loader />
          <CustomCursor />
          <Nav />
          <main className="relative">{children}</main>
        </LenisProvider>
      </body>
    </html>
  );
}
