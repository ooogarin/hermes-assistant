export type LinkMetadata = {
  url: string;
  title: string | null;
  description: string | null;
  site_name: string | null;
  author: string | null;
  type: string | null;
};

export type LinkMetadataDependencies = {
  fetch?: (input: string, init?: RequestInit) => Promise<Response>;
  lookupHost?: (hostname: string) => Promise<string[]>;
};
