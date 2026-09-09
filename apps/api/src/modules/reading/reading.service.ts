import { commitTransaction, rollbackTransaction, startTransaction } from '../../core/database/client';
import { AppError } from '../../core/errors/app-error';
import { getJakartaDateCodeParts } from '../../shared/date/date';
import { countWords } from '../../shared/text/word-count';
import * as readingRepository from './reading.repository';
import type { DatabaseReservedConnection } from '../../core/database/database.types';
import type {
  CreateReadingMaterialRequest,
  ListReadingMaterialsRequest,
  ReadingExpectedAnswer,
  ReadingMaterial,
  ReadingMaterialList,
  ReadingSettings,
  SaveReadingSubmissionRequest,
  UpdateReadingSettingsRequest,
} from './reading.types';

export const getSettings = (): Promise<ReadingSettings> => readingRepository.getSettings();

export const updateSettings = async (input: UpdateReadingSettingsRequest): Promise<ReadingSettings> => {
  const currentSettings = await getSettings();
  const min_word_count = input.min_word_count ?? currentSettings.min_word_count;
  const max_word_count = input.max_word_count ?? currentSettings.max_word_count;
  const default_word_count = input.default_word_count ?? currentSettings.default_word_count;
  if (min_word_count > max_word_count || default_word_count < min_word_count || default_word_count > max_word_count) {
    throw invalidSettings();
  }

  return readingRepository.updateSettings(input);
};

export const createMaterial = async (input: CreateReadingMaterialRequest): Promise<ReadingMaterial> => {
  const settings = await getSettings();
  let trx: DatabaseReservedConnection | undefined;

  try {
    const date = getJakartaDateCodeParts(new Date());

    trx = await startTransaction();

    const code = await readingRepository.generateCode(trx, date.key, date.segment);
    const is_override =
      input.level !== settings.default_level || input.target_word_count !== settings.default_word_count;

    await readingRepository.insertMaterial(trx, code, input, countWords(input.passage_text), is_override);
    const trxToCommit = trx;
    trx = undefined;

    await commitTransaction(trxToCommit);

    return getMaterial(code);
  } catch (error) {
    if (trx !== undefined) {
      const trxToRollback = trx;
      trx = undefined;

      await rollbackTransaction(trxToRollback).catch(() => undefined);
    }

    throw error;
  }
};

export const listMaterials = (input: ListReadingMaterialsRequest): Promise<ReadingMaterialList> => {
  return readingRepository.listMaterials(input);
};

export const getMaterial = async (code: string): Promise<ReadingMaterial> => {
  const material = await readingRepository.findByCode(code);

  if (material === null) {
    throw materialNotFound();
  }

  return material;
};

export const saveSubmission = async (code: string, input: SaveReadingSubmissionRequest): Promise<ReadingMaterial> => {
  const material = await getMaterial(code);

  validateSubmission(material, input);

  let trx: DatabaseReservedConnection | undefined;

  try {
    trx = await startTransaction();

    const result = await readingRepository.insertSubmission(trx, code, input);

    if (result === 'material_not_found') {
      throw materialNotFound();
    }

    if (result === 'already_submitted') {
      throw submissionAlreadyExists();
    }

    const trxToCommit = trx;
    trx = undefined;

    await commitTransaction(trxToCommit);

    return getMaterial(code);
  } catch (error) {
    if (trx !== undefined) {
      const trxToRollback = trx;
      trx = undefined;

      await rollbackTransaction(trxToRollback).catch(() => undefined);
    }

    throw error;
  }
};

export const getExpectedAnswers = async (code: string): Promise<ReadingExpectedAnswer[]> => {
  await getMaterial(code);

  return readingRepository.getExpectedAnswers(code);
};

// ====================================================================================================
// Helper functions
// ====================================================================================================
const validateSubmission = (material: ReadingMaterial, input: SaveReadingSubmissionRequest): void => {
  const actual = new Set(input.answers.map((answer) => answer.question_number));
  const expected = new Set(material.questions.map((question) => question.question_number));

  if (
    actual.size !== material.questions.length ||
    [...expected].some((question_number) => !actual.has(question_number))
  ) {
    throw new AppError({
      code: 'INCOMPLETE_READING_SUBMISSION',
      statusCode: 400,
      message: 'Reading submission must include every question exactly once',
    });
  }
};

const invalidSettings = (): AppError => {
  return new AppError({
    code: 'INVALID_READING_SETTINGS',
    statusCode: 400,
    message: 'Default word count must be within the configured range',
  });
};

const materialNotFound = (): AppError => {
  return new AppError({
    code: 'READING_MATERIAL_NOT_FOUND',
    statusCode: 404,
    message: 'Reading material not found',
  });
};

const submissionAlreadyExists = (): AppError => {
  return new AppError({
    code: 'READING_SUBMISSION_ALREADY_EXISTS',
    statusCode: 409,
    message: 'Reading material already has a submission',
  });
};
