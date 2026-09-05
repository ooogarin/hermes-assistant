import { Hono } from 'hono';
import { appValidator } from '../../core/http/validator';
import * as junkHandler from './junk.handler';
import { createJunkSchema, junkCodeSchema, searchJunkSchema, updateJunkSchema } from './junk.validator';
import type { AppEnv } from '../../core/http/app-env';

export const createJunkRoutes = () => {
  const route = new Hono<AppEnv>();

  route.post('/', appValidator('json', createJunkSchema), junkHandler.create);
  route.get('/', appValidator('query', searchJunkSchema), junkHandler.list);
  route.get('/:code', appValidator('param', junkCodeSchema), junkHandler.getDetail);
  route.patch(
    '/:code',
    appValidator('param', junkCodeSchema),
    appValidator('json', updateJunkSchema),
    junkHandler.update,
  );
  route.delete('/:code', appValidator('param', junkCodeSchema), junkHandler.remove);

  return route;
};
