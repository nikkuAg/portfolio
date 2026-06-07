export type ExperienceType =
  | "fulltime"
  | "internship"
  | "gsoc"
  | "leadership";

export type ExperienceItem = {
  company: string;
  role: string;
  start: string;
  end: string;
  location?: string;
  type: ExperienceType;
  highlights: string[];
  stack: string[];
};

// chronological — newest first (resume convention)
export const experience: ExperienceItem[] = [
  {
    company: "Finrep.ai",
    role: "Full Stack Engineer",
    start: "Nov 2025",
    end: "Present",
    location: "Bangalore, India",
    type: "fulltime",
    highlights: [
      "Building core product as one of the early engineers on a fintech AI platform.",
    ],
    stack: ["TypeScript", "Next.js", "React", "Node.js"],
  },
  {
    company: "Athleo.ai",
    role: "Full Stack Engineer",
    start: "Jul 2025",
    end: "Sep 2025",
    location: "Remote",
    type: "fulltime",
    highlights: [
      "Built core video editing features from scratch on the canvas element (crop, resize), eliminating external library dependencies and improving performance.",
      "Enhanced the video editor timeline with magnetic snapping, multi-track selection, and essential timeline controls.",
    ],
    stack: ["TypeScript", "React", "Canvas API", "Node.js"],
  },
  {
    company: "Athleo.ai",
    role: "Full-stack Developer Intern",
    start: "May 2025",
    end: "Jun 2025",
    location: "Remote",
    type: "internship",
    highlights: [
      "Joined as full-stack intern; converted to full-time engineering role within two months.",
    ],
    stack: ["TypeScript", "React", "Node.js"],
  },
  {
    company: "Aspora",
    role: "Full-stack Developer Intern",
    start: "Dec 2024",
    end: "Apr 2025",
    location: "Bangalore, India",
    type: "internship",
    highlights: [
      "Shipped partner API integrations, growing daily transaction throughput by 37%.",
      "Replaced AWS Glue with Airflow DAG-based ETL, cutting cloud infrastructure cost by 75%.",
      "Implemented performance optimisations across the stack, improving response times and overall reliability.",
    ],
    stack: ["Python", "Airflow", "PostgreSQL", "AWS", "Django"],
  },
  {
    company: "Wildcard",
    role: "Backend Developer Intern",
    start: "Sep 2024",
    end: "Oct 2024",
    location: "Remote",
    type: "internship",
    highlights: [
      "Built user-facing features in Go, supporting decentralised architecture.",
      "Improved query performance by 79% via strategic database indexing.",
    ],
    stack: ["Go", "PostgreSQL"],
  },
  {
    company: "Learning Equality",
    role: "Contributor, Google Summer of Code 2024",
    start: "May 2024",
    end: "Sep 2024",
    location: "Remote",
    type: "gsoc",
    highlights: [
      "Integrated Bloom Library interactive books into Kolibri, expanding educational reach across 200+ languages.",
      "Cut content upload time by 80% via the bloom-player plugin and OPDS script integration.",
    ],
    stack: ["Python", "Django", "Vue.js"],
  },
  {
    company: "BNY Mellon",
    role: "Software Developer Intern",
    start: "May 2024",
    end: "Jul 2024",
    location: "Pune, India",
    type: "internship",
    highlights: [
      "Built a ticket automation framework on top of existing loan systems, reducing manual intervention.",
      "Engaged with stakeholders across 4 departments to troubleshoot integration challenges and improve tool performance.",
    ],
    stack: ["Java", "Spring Boot", "SQL"],
  },
  {
    company: "Information Management Group, IIT Roorkee",
    role: "Chief of Product Development",
    start: "Apr 2023",
    end: "Mar 2024",
    location: "IIT Roorkee",
    type: "leadership",
    highlights: [
      "Led 40+ students managing 17 active projects serving 15,000 students and faculty.",
      "Implemented project workflows that hit 95% on-time delivery while maintaining code quality and team collaboration.",
    ],
    stack: ["Leadership", "Project Management", "React", "Django"],
  },
  {
    company: "Lica World",
    role: "Software Engineer Intern",
    start: "Dec 2023",
    end: "Jan 2024",
    location: "Remote",
    type: "internship",
    highlights: [
      "Built modular TypeScript components bridging client and server-side logic.",
    ],
    stack: ["TypeScript", "React", "Node.js"],
  },
  {
    company: "Sugar Labs",
    role: "Contributor, Google Summer of Code 2022",
    start: "Jun 2022",
    end: "Sep 2022",
    location: "Remote",
    type: "gsoc",
    highlights: [
      "Modernised core software packages, fixing 15+ critical bugs.",
      "Shipped a real-time competitive quiz feature for classroom use.",
    ],
    stack: ["JavaScript", "React"],
  },
  {
    company: "Newton School",
    role: "Software Developer Intern",
    start: "Jun 2022",
    end: "Jul 2022",
    location: "Bangalore, India",
    type: "internship",
    highlights: [
      "Built a real-time collaborative coding platform with simultaneous multi-user editing.",
      "Enhanced and optimised multiple pages on the Newton School platform.",
    ],
    stack: ["React", "Django", "Python"],
  },
];
