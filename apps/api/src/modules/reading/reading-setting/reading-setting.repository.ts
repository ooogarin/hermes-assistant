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

  const allowedColumns = [
    'default_level',
    'default_word_count',
    'default_question_count',
    'min_word_count',
    'max_word_count',
  ] as const;

  const [row] = await database<ReadingSettingsRow[]>`
    UPDATE reading_settings
    SET
      ${database(input, ...allowedColumns)},
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
