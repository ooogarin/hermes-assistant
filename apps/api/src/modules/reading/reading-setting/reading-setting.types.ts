import type { z } from 'zod';
import type { updateSettingsSchema } from './reading-setting.validator';

// ==========[ Request contracts ]==========================================================================================

export type UpdateReadingSettingsRequest = z.infer<typeof updateSettingsSchema>;

// ==========[ Service operations ]==========================================================================================

export type ReadingSettings = {
  default_level: string;
  default_word_count: number;
  default_question_count: number;
  min_word_count: number;
  max_word_count: number;
  updated_at: string;
};

export type ReadingSettingService = {
  getSettings: () => Promise<ReadingSettings>;
  updateSettings: (input: UpdateReadingSettingsRequest) => Promise<ReadingSettings>;
};

// ==========[ Repository payloads ]==========================================================================================

export type UpdateReadingSettingsPayload = {
  default_level?: string;
  default_word_count?: number;
  default_question_count?: number;
  min_word_count?: number;
  max_word_count?: number;
};

// ==========[ Repository responses ]==========================================================================================

export type ReadingSettingsRow = {
  default_level: string;
  default_word_count: number;
  default_question_count: number;
  min_word_count: number;
  max_word_count: number;
  updated_at: Date | string;
};
