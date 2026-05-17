export type Project = {
  slug: string;
  title: string;
  category: "fullstack" | "backend" | "research" | "gamedev";
  year: string;
  tagline: string;
  description: string;
  tech: string[];
  href?: string;
  github?: string;
  playable?: boolean;
  cover?: string;
  // optional per-project accent — overrides the category default for the
  // card's border / glow / gradient / title / corner ticks. Hex format
  // (e.g. "#ff5dc8"). Useful when a single project deserves its own
  // identity inside its category.
  color?: string;
};

// Order: Rank Matrix pinned first (flagship), then everything else newest →
// oldest by year. When updating, keep Rank Matrix at index 0.
export const projects: Project[] = [
  {
    slug: "rank-matrix",
    title: "Rank Matrix",
    category: "fullstack",
    year: "2022",
    tagline: "Data-driven JoSAA counselling platform for 79,000 JEE aspirants.",
    description:
      "A web platform empowering JEE aspirants to make informed decisions during JoSAA counselling. Built choice-list, advanced search, and filter UI for colleges, branches, seat matrices, and historical opening/closing rank data. A caching pass dropped load times by 64% and brought in 41,000 new active users.",
    tech: ["Django", "React", "MySQL", "Redis"],
    href: "https://rankmatrix.in",
    github: "https://github.com/nikkuAg/rankmatrix-frontend",
    color: "#6096fc",
  },
  {
    slug: "inbound",
    title: "Inbound",
    category: "fullstack",
    year: "2024",
    tagline: "Real-time recruitment evaluation tool.",
    description:
      "A recruitment tool that streamlined the IMG evaluation process — 30% increase in candidate satisfaction. Real-time feedback channels for interviewers reduced post-interview deliberation, freeing the team to focus on high-potential candidates.",
    tech: ["React", "Django", "WebSockets"],
    color: "#ff8c42",
  },
  {
    slug: "connect-e-dil",
    title: "Connect-e-dil",
    category: "fullstack",
    year: "2023",
    tagline: "Valentine's week social app for IIT Roorkee.",
    description:
      "A campus app for IIT Roorkee Valentine's week — virtual date invitations, digital roses, and a recommendation feature that analyses user inputs to suggest matches.",
    tech: ["Django", "React", "Redis", "PostgreSQL"],
    color: "#ff7687",
  },
  {
    slug: "prey-and-predator",
    title: "Prey & Predator",
    category: "research",
    year: "2023",
    tagline: "Population dynamics modelled with a fear factor.",
    description:
      "A research project examining how fear shapes prey/predator populations in response to mutual proximity. Mathematical model + numerical simulations in Mathematica, conducted with the IIT Roorkee Mathematics Department.",
    tech: ["Mathematica", "Mathematical Modeling"],
    color: "#34d399",
  },
  {
    slug: "29-8n",
    title: "29.8N",
    category: "gamedev",
    year: "2022–23",
    tagline: "IIT-R-themed 3v3 artillery shooter.",
    description:
      "An IIT Roorkee–themed artillery shooter multiplayer game. 3v3 mode with multiple weapons, strategic positioning, and skill-based scoring. Built in Unity with C#.",
    tech: ["Unity", "C#"],
    playable: true,
    color: "#a78bfa",
  },
  {
    slug: "presence-server",
    title: "Presence Server",
    category: "backend",
    year: "2022",
    tagline: "IoT lab presence tracker via Wi-Fi MAC addresses.",
    description:
      "An IoT app for the IMG lab tracking 50+ members' presence by listening for Wi-Fi-connected laptop MAC addresses. Slack integration for real-time presence monitoring and total-time-in-lab tracking.",
    tech: ["Rust", "PostgreSQL", "Slack API"],
    color: "#06b6d4",
  },
  {
    slug: "a-dot",
    title: "A DOT",
    category: "gamedev",
    year: "2021",
    tagline: "Sea-fantasy treasure hunt for Android & Windows, built in Godot.",
    description:
      "A Desire of Treasure — a 2D treasure-hunt set in a sea-fantasy world. Find the map, fight creatures, and collect the key to a very precious treasure. Includes a shop for armor/weapon upgrades, power-ups, and a catalogue of enemies and corals. Released for both Android and Windows, with a YouTube trailer.",
    tech: ["Godot", "GDScript", "Android", "Windows"],
    playable: true,
    github: "https://github.com/nikkuAg/A-DOT",
    color: "#fdf23e",
  },
];
