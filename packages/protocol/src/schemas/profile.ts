import { z } from "zod";
import { UsernameSchema } from "./auth.js";

export const ProfileSettingsSchema = z
  .object({
    username: UsernameSchema,
    avatarId: z.string().min(1).max(64).default("avatar-default"),
    frameId: z.string().min(1).max(64).default("frame-none"),
    tagId: z.string().min(1).max(64).default("tag-none"),
  })
  .strict();

export const UpdateProfileSettingsSchema =
  ProfileSettingsSchema.partial().strict();

export type ProfileSettings = z.infer<typeof ProfileSettingsSchema>;
export type UpdateProfileSettings = z.infer<typeof UpdateProfileSettingsSchema>;
