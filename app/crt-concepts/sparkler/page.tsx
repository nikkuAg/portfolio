import { ConceptHero } from "@/components/crt-concepts/ConceptHero";
import { AboutSection } from "@/components/about/AboutSection";
import { ProjectsSection } from "@/components/projects/ProjectsSection";
import { ExperienceSection } from "@/components/experience/ExperienceSection";
import { ContactSection } from "@/components/contact/ContactSection";
import { Footer } from "@/components/footer/Footer";

// Concept preview: the redesigned hero on top of the real sections, so the
// hand-off into About can be judged too.
export default function Page() {
  return (
    <>
      <ConceptHero variant="sparkler" />
      <AboutSection />
      <ProjectsSection />
      <ExperienceSection />
      <ContactSection />
      <Footer />
    </>
  );
}
