import type { ExperienceType } from "@/content/experience";

// per-type phosphor — same palette as the Projects category tints, so the
// portal gates read as one system with the project cards. Deliberately NO
// three.js import here: the HUD + fallback consume these as plain strings,
// only ExperienceScene lifts them into THREE.Color.
export const TYPE_TINT: Record<ExperienceType, string> = {
  fulltime: "#c8ff3d", // accent lime — the "shipping" cluster
  internship: "#7aa8ff", // cool blue — learning / infra
  gsoc: "#b87aff", // violet — open source / academic
  leadership: "#ff9b3d", // amber — leading people
};

// rgb tuple string form for rgba() — alpha varies per usage (HUD glows)
export const TYPE_RGB: Record<ExperienceType, string> = {
  fulltime: "200,255,61",
  internship: "122,168,255",
  gsoc: "184,122,255",
  leadership: "255,155,61",
};

export function typeBadge(type: ExperienceType) {
  switch (type) {
    case "fulltime":
      return { label: "Full-time", color: "text-accent border-accent/40" };
    case "internship":
      return { label: "Internship", color: "text-muted border-border" };
    case "gsoc":
      return { label: "GSoC", color: "text-foreground border-foreground/30" };
    case "leadership":
      return { label: "Leadership", color: "text-muted border-border" };
  }
}
