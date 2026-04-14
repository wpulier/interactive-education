export type Concept = {
  slug: string;
  title: string;
  description: string;
};

export type Section = {
  slug: string;
  title: string;
  description: string;
  type: "concepts" | "work";
  meta?: {
    author?: string;
    year?: number;
  };
  concepts: Concept[];
};
