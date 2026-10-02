import { Navigate, useLocation } from 'react-router-dom';
import { AppShell } from '../../components/layout/app-shell';
import { Button } from '../../components/ui/button';
import { useAuth } from './auth-context';
import { safeReturnTo } from './return-to';

export const AuthCheckState = ({ retry = false }: { retry?: boolean }) => {
  const { checkStatus } = useAuth();

  return (
    <main className='flex min-h-dvh items-center justify-center bg-page px-6 text-center text-ink'>
      <div className='space-y-5'>
        <p role='status' className='text-sm text-ink-muted'>
          {retry ? 'Sesi belum dapat diperiksa.' : 'Memeriksa akses…'}
        </p>
        {retry ? <Button onClick={() => void checkStatus()}>Coba lagi</Button> : null}
      </div>
    </main>
  );
};

export const AuthGate = () => {
  const { logoutCompleted, sessionEnded, state } = useAuth();
  const location = useLocation();

  if (state === 'checking') {
    return <AuthCheckState />;
  }

  if (state === 'error') {
    return <AuthCheckState retry />;
  }

  if (state === 'unauthenticated') {
    const destination = safeReturnTo(`${location.pathname}${location.search}`);
    const query = new URLSearchParams({ returnTo: destination });
    if (sessionEnded) {
      query.set('expired', '1');
    }
    if (logoutCompleted) {
      query.set('loggedOut', '1');
    }

    return <Navigate to={`/login?${query}`} replace />;
  }

  return <AppShell />;
};
