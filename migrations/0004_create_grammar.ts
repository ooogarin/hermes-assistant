import type { DatabaseTransaction } from '../src/core/database/database.types';

export const up = async (trx: DatabaseTransaction): Promise<void> => {
  await trx`CREATE TYPE grammar_mode AS ENUM ('practice', 'exam')`;
  await trx`CREATE TYPE grammar_source AS ENUM ('cron', 'request')`;
  await trx`CREATE TYPE grammar_session_status AS ENUM ('active', 'completed', 'abandoned')`;
  await trx`CREATE TYPE grammar_answer_result AS ENUM ('correct', 'partial', 'incorrect')`;
  await trx`
    CREATE TABLE grammar_settings (
      id BIGSERIAL PRIMARY KEY,
      default_level TEXT NOT NULL,
      daily_question_count INTEGER NOT NULL CHECK (daily_question_count > 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await trx`
    INSERT INTO grammar_settings (default_level, daily_question_count)
    VALUES ('A1', 5)
  `;
  await trx`
    CREATE TABLE grammar_sessions (
      id BIGSERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      mode grammar_mode NOT NULL,
      source grammar_source NOT NULL,
      status grammar_session_status NOT NULL DEFAULT 'active',
      level TEXT NOT NULL,
      question_count INTEGER NOT NULL CHECK (question_count > 0),
      score INTEGER CHECK (score >= 0),
      max_score INTEGER CHECK (max_score > 0),
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )
  `;
  await trx`
    CREATE TABLE grammar_questions (
      id BIGSERIAL PRIMARY KEY,
      session_id BIGINT NOT NULL REFERENCES grammar_sessions(id),
      question_number INTEGER NOT NULL CHECK (question_number > 0),
      question_type TEXT NOT NULL,
      grammar_area TEXT NOT NULL,
      grammar_point TEXT NOT NULL,
      level TEXT NOT NULL,
      question_text TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      explanation TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ,
      UNIQUE (session_id, question_number)
    )
  `;
  await trx`
    CREATE TABLE grammar_answers (
      id BIGSERIAL PRIMARY KEY,
      question_id BIGINT NOT NULL REFERENCES grammar_questions(id),
      user_answer TEXT NOT NULL,
      result grammar_answer_result,
      feedback TEXT,
      answered_at TIMESTAMPTZ,
      evaluated_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ,
      UNIQUE (question_id)
    )
  `;
  await trx`
    CREATE INDEX idx_grammar_sessions_active
    ON grammar_sessions (status, started_at DESC)
    WHERE deleted_at IS NULL
  `;
  await trx`
    CREATE INDEX idx_grammar_questions_session
    ON grammar_questions (session_id, question_number)
    WHERE deleted_at IS NULL
  `;
  await trx`
    CREATE INDEX idx_grammar_answers_question
    ON grammar_answers (question_id)
    WHERE deleted_at IS NULL
  `;
};

export const down = async (trx: DatabaseTransaction): Promise<void> => {
  await trx`DROP TABLE grammar_answers`;
  await trx`DROP TABLE grammar_questions`;
  await trx`DROP TABLE grammar_sessions`;
  await trx`DROP TABLE grammar_settings`;
  await trx`DROP TYPE grammar_answer_result`;
  await trx`DROP TYPE grammar_session_status`;
  await trx`DROP TYPE grammar_source`;
  await trx`DROP TYPE grammar_mode`;
};
