import { about } from "@/content/about";
import { socials } from "@/content/socials";
import { experience } from "@/content/experience";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

// Schema.org structured data — what search engines and answer engines
// (Google AI Overviews, Perplexity, ChatGPT browsing) actually parse to
// understand WHO this site is about. Built from the same content files
// the visible site renders, so it can't drift.
export function JsonLd() {
  const email = socials.find((s) => s.label === "Email")?.href;
  const sameAs = socials
    .filter((s) => s.href.startsWith("http"))
    .map((s) => s.href);
  const current = experience[0];

  const personId = `${SITE_URL}/#person`;
  const websiteId = `${SITE_URL}/#website`;

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": personId,
        name: SITE_NAME,
        url: SITE_URL,
        image: `${SITE_URL}/da-512.png`,
        jobTitle: about.title,
        description: SITE_DESCRIPTION,
        ...(email ? { email } : {}),
        address: {
          "@type": "PostalAddress",
          addressLocality: "Bangalore",
          addressCountry: "IN",
        },
        alumniOf: {
          "@type": "CollegeOrUniversity",
          name: about.education.school,
        },
        worksFor: {
          "@type": "Organization",
          name: current.company,
        },
        sameAs,
        knowsAbout: about.skills,
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        publisher: { "@id": personId },
        inLanguage: "en",
      },
      {
        "@type": "ProfilePage",
        "@id": `${SITE_URL}/#profilepage`,
        url: SITE_URL,
        name: `${SITE_NAME} · ${about.title}`,
        isPartOf: { "@id": websiteId },
        mainEntity: { "@id": personId },
        inLanguage: "en",
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // JSON.stringify output of our own static content — no user input
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
