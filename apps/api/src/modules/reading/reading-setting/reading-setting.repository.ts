import { getDatabaseClient } from '../../../core/database/client';
import type { ReadingSettingsRow, UpdateReadingSettingsPayload } from './reading-setting.types';

export const getOne = async (): Promise<ReadingSettingsRow> => {
  const database = getDatabaseClient();

  const [row] = await database<ReadingSettingsRow[]>`
    SELECT
      default_level,
      default_word_count,
      default_question_count,
      min_word_count,
      max_word_count,
      updated_at
    FROM reading_settings
    ORDER BY
      id ASC
    LIMIT 1
  `;

  if (row === undefined) {
    throw new Error('Reading settings are missing.');
  }

  return row;
};

export const updateOne = async (input: UpdateReadingSettingsPayload): Promise<ReadingSettingsRow> => {
  const database = getDatabaseClient();

  const [row] = await database<ReadingSettingsRow[]>`
    UPDATE reading_settings
    SET
      default_level = CASE WHEN ${input.default_level !== undefined} THEN ${input.default_level ?? ''} ELSE default_level END,
      default_word_count = CASE
        WHEN ${input.default_word_count !== undefined} THEN ${input.default_word_count ?? 0}
        ELSE default_word_count
      END,
      min_word_count = CASE WHEN ${input.min_word_count !== undefined} THEN ${input.min_word_count ?? 0} ELSE min_word_count END,
      max_word_count = CASE WHEN ${input.max_word_count !== undefined} THEN ${input.max_word_count ?? 0} ELSE max_word_count END,
      default_question_count = COALESCE(${input.default_question_count ?? null}::INTEGER, default_question_count),
      updated_at = NOW()
    WHERE id = (
      SELECT
        id
      FROM reading_settings
      ORDER BY
        id ASC
      LIMIT 1
    )
    RETURNING
      default_level,
      default_word_count,
      default_question_count,
      min_word_count,
      max_word_count,
      updated_at
  `;

  if (row === undefined) {
    throw new Error('Reading settings are missing.');
  }

  return row;
};
