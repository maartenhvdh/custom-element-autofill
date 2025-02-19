import { z } from "zod";

export type Config = Readonly<{
  nameElement?: string;
  sourceElement: string;
  targetElement: string,
  previewApiKey: string;
  managementApiKey: string;
}>;

export const configSchema: z.Schema<Config | null> = z.object({
  nameElement: z.string().optional(),
  sourceElement: z.string(),
  targetElement: z.string(),
  previewApiKey: z.string(),
  managementApiKey: z.string(),
}).nullable();
