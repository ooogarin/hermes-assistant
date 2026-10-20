import { commitTransaction, rollbackTransaction, startTransaction } from '../../../core/database/client';
import { notFoundError } from '../../../core/errors/not-found-error';
import { formatPublicCode } from '../../../shared/code/public-code';
import { getJakartaDateCodeParts, toIsoTimestamp } from '../../../shared/date/date';
import { toPaginationMeta } from '../../../shared/response/pagination';
import * as writingMaterialRepository from './writing-material.repository';
import type { DatabaseReservedConnection } from '../../../core/database/database.types';
import type { AppError } from '../../../core/errors/app-error';
import type {
  CreateWritingMaterialRequest,
  InsertWritingMaterialPayload,
  ListWritingMaterialsQuery,
  ListWritingMaterialsRequest,
  WritingMaterial,
  WritingMaterialList,
  WritingMaterialListItem,
  WritingMaterialListRow,
  WritingMaterialReference,
  WritingMaterialReferenceRequest,
  WritingMaterialRow,
  WritingMaterialStatus,
} from './writing-material.types';

export const createMaterial = async (input: CreateWritingMaterialRequest): Promise<WritingMaterial> => {
  let trx: DatabaseReservedConnection | undefined;

  try {
    const date = getJakartaDateCodeParts(new Date());

    trx = await startTransaction();

    const sequenceRow = await writingMaterialRepository.getLastSequenceByDateForUpdate(date.key, date.segment, trx);

    const code = formatPublicCode('WR', date.segment, sequenceRow.sequence + 1);
    const payload = toInsertWritingMaterialPayload(code, input);

    const materialRow = await writingMaterialRepository.insert(payload, trx);

    const trxToCommit = trx;
    trx = undefined;

    await commitTransaction(trxToCommit);

    return toWritingMaterial(materialRow);
  } catch (error) {
    if (trx !== undefined) {
      const trxToRollback = trx;
      trx = undefined;

      await rollbackTransaction(trxToRollback).catch(() => undefined);
    }

    throw error;
  }
};

export const listMaterials = async (input: ListWritingMaterialsRequest): Promise<WritingMaterialList> => {
  const query: ListWritingMaterialsQuery = {
    q: input.q,
    status: input.status,
    levels: 'levels' in input ? input.levels : undefined,
    genre: input.genre,
    page: input.page,
    limit: input.limit,
    sort: input.sort,
  };

  const [rows, count] = await Promise.all([
    writingMaterialRepository.getAll(query),
    writingMaterialRepository.countAll(query),
  ]);

  return toWritingMaterialList(rows, count.total, input.page, input.limit);
};

export const getMaterial = async (reference: WritingMaterialReferenceRequest): Promise<WritingMaterial> => {
  const { code } = reference;
  const materialRow = await writingMaterialRepository.getOneByCode(code);

  if (materialRow === null) {
    throw materialNotFound();
  }

  return toWritingMaterial(materialRow);
};

export const getMaterialReference = async (
  code: string,
  trx: DatabaseReservedConnection,
): Promise<WritingMaterialReference> => {
  const row = await writingMaterialRepository.getOneByCode(code, trx);

  if (row === null) {
    throw materialNotFound();
  }

  return { id: row.id, code: row.code };
};

// ==========[ Helper functions ]==========================================================================================

const toInsertWritingMaterialPayload = (
  code: string,
  input: CreateWritingMaterialRequest,
): InsertWritingMaterialPayload => ({
  code,
  topic: input.topic,
  prompt_text: input.prompt_text,
  level: input.level,
  genre: input.genre,
  tags: input.tags,
  target_word_count: input.target_word_count,
  source: input.source,
});

const toWritingMaterial = (row: WritingMaterialRow): WritingMaterial => ({
  code: row.code,
  topic: row.topic,
  prompt_text: row.prompt_text,
  level: row.level,
  genre: row.genre,
  tags: row.tags,
  target_word_count: row.target_word_count,
  source: row.source,
});

const toWritingMaterialListItem = (row: WritingMaterialListRow): WritingMaterialListItem => ({
  code: row.code,
  topic: row.topic,
  prompt_excerpt: row.prompt_text.length > 200 ? `${row.prompt_text.slice(0, 197)}...` : row.prompt_text,
  genre: row.genre,
  level: row.level,
  target_word_count: row.target_word_count,
  tags: row.tags,
  source: row.source,
  status: toWritingMaterialStatus(row),
  submission_count: Number(row.submission_count),
  analyzed_submission_count: Number(row.analyzed_submission_count),
  unanalyzed_submission_count: Number(row.submission_count) - Number(row.analyzed_submission_count),
  latest_submission_code: row.latest_submission_code,
  created_at: toIsoTimestamp(row.created_at),
});

const toWritingMaterialStatus = (row: WritingMaterialListRow): WritingMaterialStatus => {
  if (Number(row.analyzed_submission_count) > 0) {
    return 'reviewed';
  }

  if (Number(row.submission_count) > 0) {
    return 'submitted';
  }

  return 'unsubmitted';
};

const toWritingMaterialList = (
  rows: WritingMaterialListRow[],
  totalValue: number | string,
  page: number,
  limit: number,
): WritingMaterialList => {
  return {
    items: rows.map(toWritingMaterialListItem),
    meta: toPaginationMeta(totalValue, page, limit),
  };
};

const materialNotFound = (): AppError => {
  return notFoundError('WRITING_MATERIAL_NOT_FOUND', 'Writing material not found');
};
