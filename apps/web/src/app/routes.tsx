import { ArrowLeft } from 'lucide-react';
import { Suspense } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { ContentState } from '../components/feedback/content-state';
import { CollectionSkeleton } from '../components/feedback/skeleton';
import { PageHeader } from '../components/layout/page-header';
import { appRoutes } from './app-routes';
import { AuthGate } from './auth/auth-gate';
import { LoginPage } from './auth/login-page';
import type { ComponentType } from 'react';

type FeaturePlaceholderProps = {
  title: string;
};

const FeaturePlaceholder = ({ title }: FeaturePlaceholderProps) => (
  <div className='space-y-8'>
    <PageHeader title={title} />
    <ContentState title='Implementasi berikutnya' description='Foundation aplikasi sudah siap untuk fitur ini.' />
  </div>
);

const NotFoundPage = () => (
  <ContentState
    title='Halaman tidak ditemukan'
    description='Alamat yang dibuka tidak tersedia.'
    action={
      <Link className='inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline' to='/'>
        <ArrowLeft aria-hidden='true' size={18} />
        Kembali ke Ringkasan
      </Link>
    }
  />
);

const LazyPage = ({ page: Page }: { page: ComponentType }) => (
  <Suspense fallback={<CollectionSkeleton rows={5} />}>
    <Page />
  </Suspense>
);

export const AppRoutes = () => (
  <Routes>
    <Route path='login' element={<LoginPage />} />
    <Route element={<AuthGate />}>
      <Route index element={<FeaturePlaceholder title='Ringkasan' />} />
      {appRoutes.map((route) => (
        <Route key={route.path} path={route.path} element={<LazyPage page={route.page} />} />
      ))}
      <Route path='english/general' element={<FeaturePlaceholder title='General English' />} />
      <Route path='*' element={<NotFoundPage />} />
    </Route>
  </Routes>
);
