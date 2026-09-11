import { getBody, getParam, getQuery } from '../../core/http/request';
import { successResponse } from '../../core/http/response';
import * as notesService from './notes.service';
import { createNoteSchema, noteCodeSchema, searchNotesSchema, updateNoteSchema } from './notes.validator';
import type { Context } from 'hono';
import type { AppEnv } from '../../core/http/app-env';
import type { NoteReferenceRequest } from './notes.types';

export const create = async (context: Context<AppEnv>) => {
  const input = getBody(context, createNoteSchema);
  const result = await notesService.create(input);

  return successResponse({ context, data: result, statusCode: 201 });
};

export const getDetail = async (context: Context<AppEnv>) => {
  const params = getParam(context, noteCodeSchema);
  const request: NoteReferenceRequest = { code: params.code };
  const result = await notesService.getDetail(request);

  return successResponse({ context, data: result });
};

export const list = async (context: Context<AppEnv>) => {
  const query = getQuery(context, searchNotesSchema);
  const result = await notesService.list(query);

  return successResponse({ context, data: { items: result } });
};

export const update = async (context: Context<AppEnv>) => {
  const params = getParam(context, noteCodeSchema);
  const input = getBody(context, updateNoteSchema);
  const request: NoteReferenceRequest = { code: params.code };
  const result = await notesService.update(request, input);

  return successResponse({ context, data: result });
};

export const remove = async (context: Context<AppEnv>) => {
  const params = getParam(context, noteCodeSchema);
  const request: NoteReferenceRequest = { code: params.code };

  await notesService.remove(request);

  return context.body(null, 204);
};
