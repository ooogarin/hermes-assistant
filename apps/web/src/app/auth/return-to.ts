import { matchPath } from 'react-router-dom';

const protectedPaths = [
  '/',
  '/finance',
  '/finance/new',
  '/finance/report',
  '/finance/transactions/:date/:dailyNumber/edit',
  '/notes',
  '/notes/new',
  '/notes/:code',
  '/notes/:code/edit',
  '/junk',
  '/junk/new',
  '/junk/:code',
  '/junk/:code/edit',
  '/english/general',
  '/english/grammar',
  '/english/grammar/settings',
  '/english/grammar/:code',
  '/english/grammar/:code/report',
  '/english/grammar/:code/questions/:number/explanation',
  '/english/reading',
  '/english/reading/settings',
  '/english/reading/:code',
  '/english/reading/:code/expected-answers',
  '/english/writing',
  '/english/writing/settings',
  '/english/writing/new',
  '/english/writing/materials',
  '/english/writing/materials/:code',
  '/english/writing/submissions/:code',
  '/english/writing/submissions/:code/edit',
  '/english/writing/submissions/:code/feedback',
  '/english/writing/submissions/:code/corrected-text',
];

export const safeReturnTo = (value: string | null): string => {
  if (value === null || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/finance';
  }

  let destination: URL;
  try {
    destination = new URL(value, window.location.origin);
  } catch {
    return '/finance';
  }

  const matchesKnownRoute = protectedPaths.some((path) => matchPath({ path, end: true }, destination.pathname));

  if (destination.origin !== window.location.origin || !matchesKnownRoute) {
    return '/finance';
  }

  return `${destination.pathname}${destination.search}`;
};
