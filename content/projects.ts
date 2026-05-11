export type Project = {
  slug: string;
  title: string;
  category: "build" | "game" | "research";
  year: string;
  tagline: string;
  description: string;
  tech: string[];
  href?: string;
  github?: string;
  playable?: boolean;
  cover?: string;
};

export const projects: Project[] = [
  {
    slug: "rank-matrix",
    title: "Rank Matrix",
    category: "build",
    year: "2022",
    tagline: "Data-driven JoSAA counselling platform for 79,000 JEE aspirants.",
    description:
      "A web platform empowering JEE aspirants to make informed decisions during JoSAA counselling. Built choice-list, advanced search, and filter UI for colleges, branches, seat matrices, and historical opening/closing rank data. A caching pass dropped load times by 64% and brought in 41,000 new active users.",
    tech: ["Django", "React", "MySQL", "Redis"],
  },
  {
    slug: "29-8n",
    title: "29.8N",
    category: "game",
    year: "2022–23",
    tagline: "IIT-R-themed 3v3 artillery shooter.",
    description:
      "An IIT Roorkee–themed artillery shooter multiplayer game. 3v3 mode with multiple weapons, strategic positioning, and skill-based scoring. Built in Unity with C#.",
    tech: ["Unity", "C#"],
    playable: true,
  },
  {
    slug: "presence-server",
    title: "Presence Server",
    category: "build",
    year: "2022",
    tagline: "IoT lab presence tracker via Wi-Fi MAC addresses.",
    description:
      "An IoT app for the IMG lab tracking 50+ members' presence by listening for Wi-Fi-connected laptop MAC addresses. Slack integration for real-time presence monitoring and total-time-in-lab tracking.",
    tech: ["Rust", "PostgreSQL", "Slack API"],
  },
  {
    slug: "connect-e-dil",
    title: "Connect-e-dil",
    category: "build",
    year: "2023",
    tagline: "Valentine's week social app for IIT Roorkee.",
    description:
      "A campus app for IIT Roorkee Valentine's week — virtual date invitations, digital roses, and a recommendation feature that analyses user inputs to suggest matches.",
    tech: ["Django", "React", "Redis", "PostgreSQL"],
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
  },
  {
    slug: "inbound",
    title: "Inbound",
    category: "build",
    year: "2024",
    tagline: "Real-time recruitment evaluation tool.",
    description:
      "A recruitment tool that streamlined the IMG evaluation process — 30% increase in candidate satisfaction. Real-time feedback channels for interviewers reduced post-interview deliberation, freeing the team to focus on high-potential candidates.",
    tech: ["React", "Django", "WebSockets"],
  },
];
