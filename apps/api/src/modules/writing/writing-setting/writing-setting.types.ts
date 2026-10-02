import type { z } from 'zod';
import type { updateSettingsSchema } from './writing-setting.validator';

// Request contracts

export type UpdateWritingSettingsRequest = z.infer<typeof updateSettingsSchema>;

// Service operations

export type WritingSettings = {
  default_level: string;
  default_word_count: number;
  min_word_count: number;
  max_word_count: number;
  updated_at: string;
};

export type WritingSettingService = {
  getSettings: () => Promise<WritingSettings>;
  updateSettings: (input: UpdateWritingSettingsRequest) => Promise<WritingSettings>;
};

// Repository payloads

export type UpdateWritingSettingsPayload = {
  default_level?: string;
  default_word_count?: number;
  min_word_count?: number;
  max_word_count?: number;
};

// Repository responses

export type WritingSettingsRow = {
  default_level: string;
  default_word_count: number;
  min_word_count: number;
  max_word_count: number;
  updated_at: Date | string;
};
