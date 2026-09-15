import { z } from "zod";

/**
 * Validation schema for updating user preferences.
 */
export const updatePreferencesSchema = z.object({
  pushNotifications: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  newLoginDetected: z.boolean().optional(),
  haptics: z.boolean().optional(),
  inAppSounds: z.boolean().optional(),
});

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
