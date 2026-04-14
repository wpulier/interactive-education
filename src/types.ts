export type Concept = {
  slug: string;
  title: string;
  description: string;
};

export type Section = {
  slug: string;
  title: string;
  description: string;
  concepts: Concept[];
};
