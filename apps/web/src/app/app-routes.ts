import { lazy } from 'react';
import type { ComponentType } from 'react';

export type AppRoute = {
  /** Page shown for the route. */
  page: ComponentType;
  /** Path relative to the signed in area. */
  path: string;
};

/**
 * Every page behind the sign in. The table is the single source of truth, so a
 * new route is reachable after signing in as soon as it is listed here.
 */
export const appRoutes: AppRoute[] = [
  { page: lazy(() => import('../features/finance/daily/page')), path: 'finance' },
  { page: lazy(() => import('../features/finance/create/page')), path: 'finance/new' },
  { page: lazy(() => import('../features/finance/edit/page')), path: 'finance/transactions/:date/:dailyNumber/edit' },
  { page: lazy(() => import('../features/finance/report/page')), path: 'finance/report' },
  { page: lazy(() => import('../features/notes/list/page')), path: 'notes' },
  { page: lazy(() => import('../features/notes/create/page')), path: 'notes/new' },
  { page: lazy(() => import('../features/notes/detail/page')), path: 'notes/:code' },
  { page: lazy(() => import('../features/notes/edit/page')), path: 'notes/:code/edit' },
  { page: lazy(() => import('../features/junk/list/page')), path: 'junk' },
  { page: lazy(() => import('../features/junk/create/page')), path: 'junk/new' },
  { page: lazy(() => import('../features/junk/detail/page')), path: 'junk/:code' },
  { page: lazy(() => import('../features/junk/edit/page')), path: 'junk/:code/edit' },
  { page: lazy(() => import('../features/grammar/list/page')), path: 'english/grammar' },
  { page: lazy(() => import('../features/grammar/settings/page')), path: 'english/grammar/settings' },
  { page: lazy(() => import('../features/grammar/report/page')), path: 'english/grammar/:code/report' },
  { page: lazy(() => import('../features/grammar/session/page')), path: 'english/grammar/:code' },
  { page: lazy(() => import('../features/reading/list/page')), path: 'english/reading' },
  { page: lazy(() => import('../features/reading/settings/page')), path: 'english/reading/settings' },
  { page: lazy(() => import('../features/reading/detail/page')), path: 'english/reading/:code' },
  {
    page: lazy(() => import('../features/reading/expected-answers/page')),
    path: 'english/reading/:code/expected-answers',
  },
  { page: lazy(() => import('../features/writing/list/page')), path: 'english/writing' },
  { page: lazy(() => import('../features/writing/settings/page')), path: 'english/writing/settings' },
  { page: lazy(() => import('../features/writing/create/page')), path: 'english/writing/new' },
  { page: lazy(() => import('../features/writing/materials/page')), path: 'english/writing/materials' },
  { page: lazy(() => import('../features/writing/material/page')), path: 'english/writing/materials/:code' },
  { page: lazy(() => import('../features/writing/detail/page')), path: 'english/writing/submissions/:code' },
  { page: lazy(() => import('../features/writing/edit/page')), path: 'english/writing/submissions/:code/edit' },
  { page: lazy(() => import('../features/writing/feedback/page')), path: 'english/writing/submissions/:code/feedback' },
  {
    page: lazy(() => import('../features/writing/corrected-text/page')),
    path: 'english/writing/submissions/:code/corrected-text',
  },
];

/** Destinations a signed in browser may be sent back to. */
export const protectedRoutePaths = ['/', '/english/general', ...appRoutes.map((route) => `/${route.path}`)];
