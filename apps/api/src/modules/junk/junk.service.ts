import { commitTransaction, rollbackTransaction, startTransaction } from '../../core/database/client';
import { AppError } from '../../core/errors/app-error';
import { notFoundError } from '../../core/errors/not-found-error';
import { formatPublicCode } from '../../shared/code/public-code';
import { getJakartaDateCodeParts, toIsoTimestamp } from '../../shared/date/date';
import { formatTaxonomyLabel } from '../../shared/text/taxonomy';
import * as junkRepository from './junk.repository';
import type { DatabaseReservedConnection } from '../../core/database/database.types';
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

    const sequenceRow = await junkRepository.getLastSequenceByDateForUpdate(date.key, date.segment, trx);

    const code = formatPublicCode('JK', date.segment, sequenceRow.sequence + 1);
    const payload: CreateJunkPayload = {
      title: input.title,
      category: input.category,
      raw_text: input.raw_text,
      content_text: input.content_text,
      source_url: input.source_url,
      source_name: input.source_name,
      tags: input.tags,
    };

    const junkItemRow = await junkRepository.insertOne(code, payload, trx);

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
  const junkItemRow = await junkRepository.getOneByCode(code);

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
    source: input.source,
    from: input.from,
    to: input.to,
    sort: input.sort,
    limit: input.limit,
  };

  const rows = await junkRepository.getAll(query);

  return rows.map(toJunkItem);
};

export const update = async ({ code }: JunkReferenceRequest, input: UpdateJunkRequest): Promise<JunkItem> => {
  const current = await junkRepository.getOneByCode(code);

  if (current === null) {
    throw junkItemNotFound();
  }

  const title = input.title === undefined ? current.title : input.title;
  const content_text = input.content_text === undefined ? current.content_text : input.content_text;
  const source_url = input.source_url === undefined ? current.source_url : input.source_url;
  const hasContent = [title, content_text, current.raw_text, source_url].some((value) => value !== null);

  if (!hasContent) {
    throw new AppError({
      code: 'JUNK_CONTENT_REQUIRED',
      statusCode: 400,
      message: 'Junk item needs a title, text, or URL',
    });
  }

  const payload: UpdateJunkPayload = {
    title: input.title,
    category: input.category,
    content_text: input.content_text,
    source_url: input.source_url,
    tags: input.tags,
    source_name: input.source_name,
  };

  const junkItemRow = await junkRepository.updateOneByCode(code, payload);

  if (junkItemRow === null) {
    throw junkItemNotFound();
  }

  return toJunkItem(junkItemRow);
};

export const remove = async ({ code }: JunkReferenceRequest): Promise<void> => {
  const deleted = await junkRepository.softDeleteOneByCode(code);

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
  category: formatTaxonomyLabel(row.category),
  raw_text: row.raw_text,
  content_text: row.content_text,
  source_url: row.source_url,
  source_name: row.source_name,
  tags: row.tags.map(formatTaxonomyLabel),
  created_at: toIsoTimestamp(row.created_at),
  updated_at: toIsoTimestamp(row.updated_at),
  deleted_at: row.deleted_at === null ? null : toIsoTimestamp(row.deleted_at),
});

const junkItemNotFound = (): AppError => {
  return notFoundError('JUNK_ITEM_NOT_FOUND', 'Junk item not found');
};
