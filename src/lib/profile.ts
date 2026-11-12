export const AUDIENCES = ["job_seeker", "sales", "recruiter"] as const;
export type Audience = (typeof AUDIENCES)[number];

export type Profile = {
  user_id: string;
  audience: Audience;
  roles: string[];
  skills: string[];
  cities: string[];
  sectors: string[];
  stages: string[];
};

export const STATUSES = ["saved", "contacted", "replied", "meeting", "closed", "passed"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  saved: "Saved",
  contacted: "Contacted",
  replied: "Replied",
  meeting: "Meeting",
  closed: "Closed",
  passed: "Passed",
};

export type ShortlistRow = {
  id: string;
  user_id: string;
  deal_id: string;
  status: Status;
  notes: string;
  created_at: string;
  updated_at: string;
};

export const AUDIENCE_COPY: Record<
  Audience,
  { label: string; title: string; blurb: string; rolesLabel: string; skillsLabel: string; rolesHint: string; skillsHint: string; showRoles: boolean }
> = {
  job_seeker: {
    label: "I am job hunting",
    title: "Startups likely to hire you",
    blurb: "Funded companies whose predicted roles match what you want.",
    rolesLabel: "Roles you want",
    skillsLabel: "Your skills",
    rolesHint: "Backend engineer, product manager",
    skillsHint: "Python, payments, SQL",
    showRoles: true,
  },
  sales: {
    label: "I sell to startups",
    title: "Funded accounts that fit your offer",
    blurb: "Freshly funded companies in your target sectors and stages, with needs that match what you sell.",
    rolesLabel: "Roles you sell to",
    skillsLabel: "What you sell or need to see in a deal",
    rolesHint: "",
    skillsHint: "recruitment, marketing, cloud infrastructure, compliance",
    showRoles: false,
  },
  recruiter: {
    label: "I recruit for startups",
    title: "Funded companies likely to need your candidates",
    blurb: "Funded companies predicted to hire the roles you place.",
    rolesLabel: "Roles you place",
    skillsLabel: "Skills you place",
    rolesHint: "AI/ML engineer, sales manager",
    skillsHint: "machine learning, B2B sales",
    showRoles: true,
  },
};

export function parseList(input: string, max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of input.split(/[,\n]/)) {
    const v = part.trim().slice(0, 60);
    const k = v.toLowerCase();
    if (v && !seen.has(k)) {
      seen.add(k);
      out.push(v);
    }
    if (out.length >= max) break;
  }
  return out;
}
