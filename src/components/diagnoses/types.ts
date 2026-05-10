import type { z } from "zod";

import {
  evidenceLinkedTypeSchema,
  evidenceLinkSchema,
  type CreateEvidenceLinkInput as ContractsCreateEvidenceLinkInput,
  type EvidenceLink as ContractsEvidenceLink,
} from "@/server/contracts";

export type EvidenceLinkedTypeKey = z.infer<typeof evidenceLinkedTypeSchema>;
export type EvidenceLink = ContractsEvidenceLink;
export type CreateEvidenceLinkInput = ContractsCreateEvidenceLinkInput;

// re-export schema so callers can import it from one place
export { evidenceLinkSchema };
