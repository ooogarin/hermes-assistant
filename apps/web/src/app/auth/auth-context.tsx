import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { onDomainUnauthorized } from '../../lib/api/api-client';
import { ApiError } from '../../lib/api/api-error';
import { getAuthStatus, loginWithPassword, logout } from './auth-api';
import type { ReactNode } from 'react';

type AuthState = 'checking' | 'authenticated' | 'unauthenticated' | 'error';

type AuthContextValue = {
  checkStatus: () => Promise<void>;
  login: (password: string) => Promise<void>;
  logoutCompleted: boolean;
  logout: () => Promise<void>;
  sessionEnded: boolean;
  state: AuthState;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const logoutChannelName = 'hermes-auth';

export class CookieUnavailableError extends Error {}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>('checking');
  const [expiresAt, setExpiresAt] = useState<number>();
  const [logoutCompleted, setLogoutCompleted] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const requestVersion = useRef(0);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const checkStatus = useCallback(async () => {
    const version = ++requestVersion.current;
    setState('checking');

    try {
      const status = await getAuthStatus();
      if (version === requestVersion.current) {
        setExpiresAt(Date.parse(status.expires_at));
        setLogoutCompleted(false);
        setSessionEnded(false);
        setState('authenticated');
      }
    } catch (error) {
      if (version === requestVersion.current) {
        setExpiresAt(undefined);
        setState(error instanceof ApiError && error.status === 401 ? 'unauthenticated' : 'error');
      }
    }
  }, []);

  useEffect(() => {
    void checkStatus();

    return onDomainUnauthorized(() => {
      requestVersion.current += 1;
      setExpiresAt(undefined);
      setLogoutCompleted(false);
      setSessionEnded(true);
      setState('unauthenticated');
    });
  }, [checkStatus]);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') {
      return;
    }

    const channel = new BroadcastChannel(logoutChannelName);
    channelRef.current = channel;
    channel.onmessage = (event: MessageEvent<unknown>) => {
      if (event.data === 'logout') {
        requestVersion.current += 1;
        setExpiresAt(undefined);
        setLogoutCompleted(true);
        setSessionEnded(false);
        setState('unauthenticated');
      }
    };

    return () => {
      channelRef.current = null;
      channel.close();
    };
  }, []);

  useEffect(() => {
    if (state !== 'authenticated' || expiresAt === undefined) {
      return;
    }

    const remainingTime = expiresAt - Date.now();
    const timer = window.setTimeout(
      () => {
        setExpiresAt(undefined);
        setLogoutCompleted(false);
        setSessionEnded(true);
        setState('unauthenticated');
      },
      Math.max(0, remainingTime),
    );

    return () => window.clearTimeout(timer);
  }, [expiresAt, state]);

  const login = async (password: string) => {
    await loginWithPassword(password);
    const version = ++requestVersion.current;

    try {
      const status = await getAuthStatus();
      if (version === requestVersion.current) {
        setExpiresAt(Date.parse(status.expires_at));
        setLogoutCompleted(false);
        setSessionEnded(false);
        setState('authenticated');
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        throw new CookieUnavailableError();
      }

      throw error;
    }
  };

  const signOut = async () => {
    await logout();

    requestVersion.current += 1;
    setExpiresAt(undefined);
    setLogoutCompleted(true);
    setSessionEnded(false);
    setState('unauthenticated');

    channelRef.current?.postMessage('logout');
  };

  return (
    <AuthContext.Provider value={{ checkStatus, login, logout: signOut, logoutCompleted, sessionEnded, state }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error('AuthProvider is missing.');
  }

  return context;
};
