import { Hono } from 'hono';
import { appValidator } from '../../core/http/validator';
import * as notesHandler from './notes.handler';
import { createNoteSchema, noteCodeSchema, searchNotesSchema, updateNoteSchema } from './notes.validator';
import type { AppEnv } from '../../core/http/app-env';

export const createNotesRoutes = () => {
  const route = new Hono<AppEnv>();

  route.post('/', appValidator('json', createNoteSchema), notesHandler.create);
  route.get('/', appValidator('query', searchNotesSchema), notesHandler.list);
  route.get('/:code', appValidator('param', noteCodeSchema), notesHandler.getDetail);
  route.patch(
    '/:code',
    appValidator('param', noteCodeSchema),
    appValidator('json', updateNoteSchema),
    notesHandler.update,
  );
  route.delete('/:code', appValidator('param', noteCodeSchema), notesHandler.remove);

  return route;
};
