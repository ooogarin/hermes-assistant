import type { DatabaseTransaction } from '../src/core/database/database.types';

export const up = async (trx: DatabaseTransaction): Promise<void> => {
  await trx`CREATE TYPE reading_source AS ENUM ('cron', 'request')`;
  await trx`
    CREATE TABLE reading_settings (
      id BIGSERIAL PRIMARY KEY,
      default_level TEXT NOT NULL,
      default_word_count INTEGER NOT NULL CHECK (default_word_count > 0),
      min_word_count INTEGER NOT NULL CHECK (min_word_count > 0),
      max_word_count INTEGER NOT NULL CHECK (max_word_count >= min_word_count),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (default_word_count BETWEEN min_word_count AND max_word_count)
    )
  `;
  await trx`
    INSERT INTO reading_settings (
      default_level,
      default_word_count,
      min_word_count,
      max_word_count
    )
    VALUES ('A1', 300, 250, 350)
  `;
  await trx`
    CREATE TABLE reading_materials (
      id BIGSERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      topic TEXT NOT NULL,
      level TEXT NOT NULL,
      genre TEXT NOT NULL,
      tags TEXT[] NOT NULL DEFAULT '{}',
      target_word_count INTEGER NOT NULL CHECK (target_word_count > 0),
      word_count INTEGER NOT NULL CHECK (word_count > 0),
      passage_text TEXT NOT NULL,
      is_override BOOLEAN NOT NULL,
      source reading_source NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )
  `;
  await trx`
    CREATE TABLE reading_questions (
      id BIGSERIAL PRIMARY KEY,
      material_id BIGINT NOT NULL REFERENCES reading_materials(id),
      question_number INTEGER NOT NULL CHECK (question_number > 0),
      question_text TEXT NOT NULL,
      expected_answer TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ,
      UNIQUE (material_id, question_number)
    )
  `;
  await trx`
    CREATE TABLE reading_submissions (
      id BIGSERIAL PRIMARY KEY,
      material_id BIGINT NOT NULL UNIQUE REFERENCES reading_materials(id),
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )
  `;
  await trx`
    CREATE TABLE reading_answers (
      id BIGSERIAL PRIMARY KEY,
      submission_id BIGINT NOT NULL REFERENCES reading_submissions(id),
      question_id BIGINT NOT NULL REFERENCES reading_questions(id),
      user_answer TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ,
      UNIQUE (submission_id, question_id)
    )
  `;
  await trx`
    CREATE INDEX idx_reading_materials_active
    ON reading_materials (created_at DESC)
    WHERE deleted_at IS NULL
  `;
  await trx`
    CREATE INDEX idx_reading_questions_material
    ON reading_questions (material_id, question_number)
    WHERE deleted_at IS NULL
  `;
};

export const down = async (trx: DatabaseTransaction): Promise<void> => {
  await trx`DROP TABLE reading_answers`;
  await trx`DROP TABLE reading_submissions`;
  await trx`DROP TABLE reading_questions`;
  await trx`DROP TABLE reading_materials`;
  await trx`DROP TABLE reading_settings`;
  await trx`DROP TYPE reading_source`;
};
