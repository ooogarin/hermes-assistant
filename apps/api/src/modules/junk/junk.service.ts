import { commitTransaction, rollbackTransaction, startTransaction } from '../../core/database/client';
import { notFoundError } from '../../core/errors/not-found-error';
import { formatPublicCode } from '../../shared/code/public-code';
import { getJakartaDateCodeParts, toIsoTimestamp } from '../../shared/date/date';
import * as junkRepository from './junk.repository';
import type { DatabaseReservedConnection } from '../../core/database/database.types';
import type { AppError } from '../../core/errors/app-error';
import type {
  CreateJunkPayload,
  CreateJunkRequest,
  JunkItem,
  JunkItemRow,
  JunkReferenceRequest,
  ListJunkRepositoryQuery,
  ListJunkRequest,
  UpdateJunkPayload,
  UpdateJunkRequest,
} from './junk.types';

export const create = async (input: CreateJunkRequest): Promise<JunkItem> => {
  let trx: DatabaseReservedConnection | undefined;

  try {
    const date = getJakartaDateCodeParts(new Date());
    trx = await startTransaction();

    const sequenceRow = await junkRepository.getNextSequence(trx, date.key, date.segment);
    const code = formatPublicCode('JK', date.segment, sequenceRow.sequence + 1);
    const payload: CreateJunkPayload = {
      title: input.title,
      category: input.category,
      raw_text: input.raw_text,
      content_text: input.content_text,
      source_url: input.source_url,
      tags: input.tags,
    };
    const junkItemRow = await junkRepository.insert(trx, code, payload);
    const trxToCommit = trx;
    trx = undefined;

    await commitTransaction(trxToCommit);

    return toJunkItem(junkItemRow);
  } catch (error) {
    if (trx !== undefined) {
      const trxToRollback = trx;
      trx = undefined;

      await rollbackTransaction(trxToRollback).catch(() => undefined);
    }

    throw error;
  }
};

export const getDetail = async ({ code }: JunkReferenceRequest): Promise<JunkItem> => {
  const junkItemRow = await junkRepository.findByCode(code);

  if (junkItemRow === null) {
    throw junkItemNotFound();
  }

  return toJunkItem(junkItemRow);
};

export const list = async (input: ListJunkRequest): Promise<JunkItem[]> => {
  const query: ListJunkRepositoryQuery = {
    q: input.q,
    tag: input.tag,
    category: input.category,
    source_url: input.source_url,
    limit: input.limit,
  };

  const rows = await junkRepository.getAll(query);
  return rows.map(toJunkItem);
};

export const update = async ({ code }: JunkReferenceRequest, input: UpdateJunkRequest): Promise<JunkItem> => {
  const payload: UpdateJunkPayload = {
    title: input.title,
    category: input.category,
    content_text: input.content_text,
    source_url: input.source_url,
    tags: input.tags,
  };
  const junkItemRow = await junkRepository.updateByCode(code, payload);

  if (junkItemRow === null) {
    throw junkItemNotFound();
  }

  return toJunkItem(junkItemRow);
};

export const remove = async ({ code }: JunkReferenceRequest): Promise<void> => {
  const deleted = await junkRepository.softDeleteByCode(code);

  if (!deleted) {
    throw junkItemNotFound();
  }
};

// ====================================================================================================
// Helper functions
// ====================================================================================================

const toJunkItem = (row: JunkItemRow): JunkItem => ({
  code: row.code,
  title: row.title,
  category: row.category,
  raw_text: row.raw_text,
  content_text: row.content_text,
  source_url: row.source_url,
  tags: row.tags,
  created_at: toIsoTimestamp(row.created_at),
  updated_at: toIsoTimestamp(row.updated_at),
  deleted_at: row.deleted_at === null ? null : toIsoTimestamp(row.deleted_at),
});

const junkItemNotFound = (): AppError => {
  return notFoundError('JUNK_ITEM_NOT_FOUND', 'Junk item not found');
};
