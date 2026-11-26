import type { Metadata } from "next";
import { Archivo } from "next/font/google";

// Archivo's width axis gives the expanded, station-ident lettering used on
// the test card, reel and set badge.
const archivo = Archivo({
  variable: "--font-ident",
  subsets: ["latin"],
  axes: ["wdth"],
});

export const metadata: Metadata = {
  title: "CRT concepts",
  robots: { index: false, follow: false },
};

export default function ConceptsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={archivo.variable} data-tv-fonts>
      {/* preview-only: ?skipintro skips the site loader so a concept can be
          shared or screenshotted straight onto the set */}
      <script
        dangerouslySetInnerHTML={{
          __html: `if(location.search.includes("skipintro"))sessionStorage.setItem("loader-done","1")`,
        }}
      />
      {children}
    </div>
  );
}
