import { z } from "zod";
import { uuidSchema } from "./common";

export const bodyRegionDTOSchema = z.object({
  id: uuidSchema,
  slug: z.string(),
  name: z.string(),
  side: z.enum(["left", "right", "bilateral", "midline", "unknown"]).nullable(),
  parent_region_id: uuidSchema.nullable(),
  display_order: z.number().int(),
});

export const symptomDTOSchema = z.object({
  id: uuidSchema,
  slug: z.string(),
  name: z.string(),
  category: z.string(),
  display_order: z.number().int(),
});

export const triggerDTOSchema = z.object({
  id: uuidSchema,
  slug: z.string(),
  name: z.string(),
  category: z.string(),
  is_bella_specific: z.boolean(),
  display_order: z.number().int(),
});

export const referenceDataDTOSchema = z.object({
  body_regions: z.array(bodyRegionDTOSchema),
  symptoms: z.array(symptomDTOSchema),
  triggers: z.array(triggerDTOSchema),
});

export type BodyRegionDTO = z.infer<typeof bodyRegionDTOSchema>;
export type SymptomDTO = z.infer<typeof symptomDTOSchema>;
export type TriggerDTO = z.infer<typeof triggerDTOSchema>;
export type ReferenceDataDTO = z.infer<typeof referenceDataDTOSchema>;
