import { z } from 'zod'

/** Participant form — validated client-side AND re-validated server-side. */
export const participantSchema = z.object({
  typeId: z.uuid(),
  fullName: z.string().trim().min(1, 'Full name is required').max(200),
  englishName: z.string().trim().max(200).optional().default(''),
  email: z.email('A valid email is required').max(320),
  phone: z.string().trim().max(40).optional().default(''),
  affiliation: z.string().trim().min(1, 'Affiliation is required').max(300),
  department: z.string().trim().max(200).optional().default(''),
  position: z.string().trim().max(120).optional().default(''),
  country: z.string().trim().min(1, 'Country / region is required').max(100),
  dietary: z.string().trim().max(200).optional().default(''),
  invoiceRequired: z.boolean().optional().default(false),
  invoiceTitle: z.string().trim().max(300).optional().default(''),
})

export type ParticipantInput = z.output<typeof participantSchema>

export const createRegistrationSchema = participantSchema.extend({
  // accepted-terms-style flags can be added here later
})

export const lookupByEmailSchema = z.object({
  email: z.email(),
})
