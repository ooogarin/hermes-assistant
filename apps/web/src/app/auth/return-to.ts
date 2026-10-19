import { matchPath } from 'react-router-dom';
import { protectedRoutePaths } from '../app-routes';

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

  const matchesKnownRoute = protectedRoutePaths.some((path) => matchPath({ path, end: true }, destination.pathname));

  if (destination.origin !== window.location.origin || !matchesKnownRoute) {
    return '/finance';
  }

  return `${destination.pathname}${destination.search}`;
};
