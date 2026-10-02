import { Eye, EyeOff, Feather } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Field, Input } from '../../components/ui/form-field';
import { ApiError } from '../../lib/api/api-error';
import { CookieUnavailableError, useAuth } from './auth-context';
import { AuthCheckState } from './auth-gate';
import { safeReturnTo } from './return-to';
import type { FormEvent } from 'react';

export const LoginPage = () => {
  const { login, state } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const destination = safeReturnTo(searchParams.get('returnTo'));
  const passwordRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [fieldError, setFieldError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [retryAt, setRetryAt] = useState<number>();
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  useEffect(() => {
    if (retryAt === undefined) {
      return;
    }

    const update = () => {
      const remaining = Math.max(0, Math.ceil((retryAt - Date.now()) / 1_000));
      setSecondsRemaining(remaining);

      if (remaining === 0) {
        setFormError(undefined);
        setRetryAt(undefined);
      }
    };
    update();
    const timer = window.setInterval(update, 1_000);

    return () => window.clearInterval(timer);
  }, [retryAt]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (pending || secondsRemaining > 0) {
      return;
    }

    if (password.length === 0) {
      setFieldError('Masukkan kata sandi.');
      passwordRef.current?.focus();
      return;
    }

    setPending(true);
    setFieldError(undefined);
    setFormError(undefined);

    try {
      await login(password);
      setPassword('');
      navigate(destination, { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'INVALID_CREDENTIALS') {
        setPassword('');
        setFieldError('Kata sandi tidak sesuai. Coba lagi.');
        passwordRef.current?.focus();
      } else if (error instanceof ApiError && error.status === 429) {
        const waitSeconds = error.retryAfter ?? 60;
        setRetryAt(Date.now() + waitSeconds * 1_000);
        setSecondsRemaining(waitSeconds);
        setFormError(`Terlalu banyak percobaan. Coba lagi dalam ${waitSeconds} detik.`);
      } else if (error instanceof CookieUnavailableError) {
        setFormError('Sesi belum tersimpan. Pastikan cookie diizinkan, lalu coba masuk lagi.');
      } else if (error instanceof ApiError && error.status === 403) {
        setFormError('Permintaan masuk tidak dapat diproses dari alamat ini.');
      } else if (error instanceof ApiError && error.status === 0) {
        setFormError('Layanan belum dapat dihubungi. Periksa koneksi lalu coba lagi.');
      } else {
        setFormError('Belum bisa masuk. Coba lagi sebentar.');
      }
    } finally {
      setPending(false);
    }
  };

  if (state === 'checking') {
    return <AuthCheckState />;
  }

  if (state === 'error') {
    return <AuthCheckState retry />;
  }

  if (state === 'authenticated') {
    return <Navigate to={destination} replace />;
  }

  const notice = searchParams.has('loggedOut')
    ? 'Kamu sudah keluar.'
    : searchParams.has('expired')
      ? 'Sesi berakhir. Masuk lagi untuk melanjutkan.'
      : undefined;

  return (
    <main className='flex min-h-dvh flex-col bg-page px-6 py-8 text-ink sm:px-10 sm:py-10'>
      <div className='mx-auto flex w-full max-w-6xl items-center gap-2.5 text-primary'>
        <Feather aria-hidden='true' size={28} strokeWidth={1.8} />
        <span className='font-display text-3xl font-semibold tracking-tight'>Hermes</span>
      </div>

      <div className='mx-auto flex w-full max-w-6xl flex-1 items-center justify-center py-14'>
        <div className='w-full max-w-[25rem]'>
          <header className='mb-9'>
            <h1 className='text-3xl font-semibold tracking-tight sm:text-4xl'>Selamat datang kembali</h1>
            <p className='mt-3 text-base text-ink-muted'>Masuk ke ruang personalmu.</p>
          </header>

          {notice ? (
            <p className='mb-6 text-sm text-ink-muted' role='status'>
              {notice}
            </p>
          ) : null}

          <form className='space-y-6' onSubmit={submit}>
            <Field error={fieldError} htmlFor='login-password' label='Kata sandi' messageId='login-password-error'>
              <div className='relative'>
                <Input
                  ref={passwordRef}
                  id='login-password'
                  className='min-h-12 pr-14 text-base'
                  type={visible ? 'text' : 'password'}
                  name='password'
                  autoComplete='current-password'
                  autoCapitalize='off'
                  spellCheck={false}
                  maxLength={512}
                  aria-invalid={fieldError === undefined ? undefined : true}
                  aria-describedby={fieldError === undefined ? undefined : 'login-password-error'}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setFieldError(undefined);
                  }}
                />
                <button
                  type='button'
                  className='absolute inset-y-0 right-0 flex min-w-12 items-center justify-center rounded-r-control text-ink-muted hover:text-ink focus-visible:outline-primary'
                  aria-label={visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  onClick={() => setVisible((current) => !current)}
                >
                  {visible ? <EyeOff aria-hidden='true' size={20} /> : <Eye aria-hidden='true' size={20} />}
                </button>
              </div>
            </Field>

            {fieldError ? (
              <span className='sr-only' role='alert'>
                {fieldError}
              </span>
            ) : null}
            {formError ? (
              <p className='text-sm text-danger' role='alert'>
                {formError}
              </p>
            ) : null}

            <Button
              className='min-h-12 w-full'
              type='submit'
              pending={pending}
              pendingLabel='Memeriksa…'
              disabled={secondsRemaining > 0}
            >
              Masuk
            </Button>
          </form>

          <p className='mt-9 border-t border-border pt-6 text-sm text-ink-muted'>Hanya untuk penggunaan pribadi.</p>
        </div>
      </div>
    </main>
  );
};
