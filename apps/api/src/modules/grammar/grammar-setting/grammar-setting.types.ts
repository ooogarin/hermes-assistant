import type { z } from 'zod';
import type { updateSettingsSchema } from './grammar-setting.validator';

// ==========[ Request contracts ]==========================================================================================

export type UpdateGrammarSettingsRequest = z.infer<typeof updateSettingsSchema>;

// ==========[ Service operations ]==========================================================================================

export type GrammarSettings = {
  default_level: string;
  daily_question_count: number;
  updated_at: string;
};

export type GrammarSettingService = {
  getSettings: () => Promise<GrammarSettings>;
  updateSettings: (input: UpdateGrammarSettingsRequest) => Promise<GrammarSettings>;
};

// ==========[ Repository payloads ]==========================================================================================

export type UpdateGrammarSettingsPayload = {
  default_level?: string;
  daily_question_count?: number;
};

// ==========[ Repository responses ]==========================================================================================

export type GrammarSettingsRow = {
  default_level: string;
  daily_question_count: number;
  updated_at: Date | string;
};
