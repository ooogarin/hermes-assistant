import { toIsoTimestamp } from '../../../shared/date/date';
import * as grammarSettingRepository from './grammar-setting.repository';
import type {
  GrammarSettings,
  GrammarSettingsRow,
  UpdateGrammarSettingsPayload,
  UpdateGrammarSettingsRequest,
} from './grammar-setting.types';

export const getSettings = async (): Promise<GrammarSettings> => {
  const settingsRow = await grammarSettingRepository.getOne();

  return toGrammarSettings(settingsRow);
};

export const updateSettings = async (input: UpdateGrammarSettingsRequest): Promise<GrammarSettings> => {
  const payload: UpdateGrammarSettingsPayload = {
    default_level: input.default_level,
    daily_question_count: input.daily_question_count,
  };

  const settingsRow = await grammarSettingRepository.updateOne(payload);

  return toGrammarSettings(settingsRow);
};

// ==========[ Helper functions ]==========================================================================================

const toGrammarSettings = (row: GrammarSettingsRow): GrammarSettings => ({
  default_level: row.default_level,
  daily_question_count: row.daily_question_count,
  updated_at: toIsoTimestamp(row.updated_at),
});
