import { AppError } from '../../../core/errors/app-error';
import { toIsoTimestamp } from '../../../shared/date/date';
import * as readingSettingRepository from './reading-setting.repository';
import type {
  ReadingSettings,
  ReadingSettingsRow,
  UpdateReadingSettingsPayload,
  UpdateReadingSettingsRequest,
} from './reading-setting.types';

export const getSettings = async (): Promise<ReadingSettings> => {
  const settingsRow = await readingSettingRepository.getOne();

  return toReadingSettings(settingsRow);
};

// ==========[ Helper functions ]==========================================================================================

export const updateSettings = async (input: UpdateReadingSettingsRequest): Promise<ReadingSettings> => {
  const currentSettings = await getSettings();

  const min_word_count = input.min_word_count ?? currentSettings.min_word_count;
  const max_word_count = input.max_word_count ?? currentSettings.max_word_count;
  const default_word_count = input.default_word_count ?? currentSettings.default_word_count;
  const hasInvalidWordCountRange = min_word_count > max_word_count;
  const isDefaultWordCountOutOfRange = default_word_count < min_word_count || default_word_count > max_word_count;

  if (hasInvalidWordCountRange || isDefaultWordCountOutOfRange) {
    throw invalidSettings();
  }

  const payload: UpdateReadingSettingsPayload = {
    default_level: input.default_level,
    default_word_count: input.default_word_count,
    default_question_count: input.default_question_count,
    min_word_count: input.min_word_count,
    max_word_count: input.max_word_count,
  };

  const settingsRow = await readingSettingRepository.updateOne(payload);

  return toReadingSettings(settingsRow);
};

const toReadingSettings = (row: ReadingSettingsRow): ReadingSettings => ({
  default_level: row.default_level,
  default_word_count: row.default_word_count,
  default_question_count: row.default_question_count,
  min_word_count: row.min_word_count,
  max_word_count: row.max_word_count,
  updated_at: toIsoTimestamp(row.updated_at),
});

const invalidSettings = (): AppError => {
  return new AppError({
    code: 'INVALID_READING_SETTINGS',
    statusCode: 400,
    message: 'Default word count must be within the configured range',
  });
};
