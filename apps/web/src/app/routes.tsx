import { ArrowLeft } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { ContentState } from '../components/feedback/content-state';
import { CollectionSkeleton } from '../components/feedback/skeleton';
import { AppShell } from '../components/layout/app-shell';
import { PageHeader } from '../components/layout/page-header';

const FinanceDailyPage = lazy(() => import('../features/finance/daily/page'));
const FinanceReportPage = lazy(() => import('../features/finance/report/page'));
const JunkDetailPage = lazy(() => import('../features/junk/detail/page'));
const JunkListPage = lazy(() => import('../features/junk/list/page'));
const NotesDetailPage = lazy(() => import('../features/notes/detail/page'));
const NotesListPage = lazy(() => import('../features/notes/list/page'));
const ReadingDetailPage = lazy(() => import('../features/reading/detail/page'));
const ReadingExpectedAnswersPage = lazy(() => import('../features/reading/expected-answers/page'));
const ReadingListPage = lazy(() => import('../features/reading/list/page'));
const ReadingSettingsPage = lazy(() => import('../features/reading/settings/page'));
const CorrectedWritingPage = lazy(() => import('../features/writing/corrected-text/page'));
const WritingDetailPage = lazy(() => import('../features/writing/detail/page'));
const WritingFeedbackPage = lazy(() => import('../features/writing/feedback/page'));
const WritingListPage = lazy(() => import('../features/writing/list/page'));
const WritingSettingsPage = lazy(() => import('../features/writing/settings/page'));

type FeaturePlaceholderProps = {
  description: string;
  title: string;
};

const FeaturePlaceholder = ({ description, title }: FeaturePlaceholderProps) => (
  <div className='space-y-8'>
    <PageHeader title={title} description={description} />
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

export const AppRoutes = () => (
  <Routes>
    <Route element={<AppShell />}>
      <Route
        index
        element={
          <FeaturePlaceholder
            title='Ringkasan'
            description='Ringkasan akan tersedia setelah kebutuhan dan kontrak datanya ditetapkan.'
          />
        }
      />
      <Route
        path='finance'
        element={
          <Suspense fallback={<CollectionSkeleton rows={5} />}>
            <FinanceDailyPage />
          </Suspense>
        }
      />
      <Route
        path='finance/report'
        element={
          <Suspense fallback={<CollectionSkeleton rows={5} />}>
            <FinanceReportPage />
          </Suspense>
        }
      />
      <Route
        path='notes'
        element={
          <Suspense fallback={<CollectionSkeleton rows={5} />}>
            <NotesListPage />
          </Suspense>
        }
      />
      <Route
        path='notes/:code'
        element={
          <Suspense fallback={<CollectionSkeleton rows={5} />}>
            <NotesDetailPage />
          </Suspense>
        }
      />
      <Route
        path='junk'
        element={
          <Suspense fallback={<CollectionSkeleton rows={5} />}>
            <JunkListPage />
          </Suspense>
        }
      />
      <Route
        path='junk/:code'
        element={
          <Suspense fallback={<CollectionSkeleton rows={5} />}>
            <JunkDetailPage />
          </Suspense>
        }
      />
      <Route
        path='english/general'
        element={<FeaturePlaceholder title='General English' description='Tanya apa saja tentang bahasa Inggris.' />}
      />
      <Route
        path='english/grammar/*'
        element={<FeaturePlaceholder title='Grammar' description='Latihan grammar dalam mode practice atau exam.' />}
      />
      <Route
        path='english/reading'
        element={
          <Suspense fallback={<CollectionSkeleton rows={5} />}>
            <ReadingListPage />
          </Suspense>
        }
      />
      <Route
        path='english/reading/settings'
        element={
          <Suspense fallback={<CollectionSkeleton rows={5} />}>
            <ReadingSettingsPage />
          </Suspense>
        }
      />
      <Route
        path='english/reading/:code'
        element={
          <Suspense fallback={<CollectionSkeleton rows={5} />}>
            <ReadingDetailPage />
          </Suspense>
        }
      />
      <Route
        path='english/reading/:code/expected-answers'
        element={
          <Suspense fallback={<CollectionSkeleton rows={5} />}>
            <ReadingExpectedAnswersPage />
          </Suspense>
        }
      />
      <Route
        path='english/writing'
        element={
          <Suspense fallback={<CollectionSkeleton rows={5} />}>
            <WritingListPage />
          </Suspense>
        }
      />
      <Route
        path='english/writing/settings'
        element={
          <Suspense fallback={<CollectionSkeleton rows={5} />}>
            <WritingSettingsPage />
          </Suspense>
        }
      />
      <Route
        path='english/writing/:code'
        element={
          <Suspense fallback={<CollectionSkeleton rows={5} />}>
            <WritingDetailPage />
          </Suspense>
        }
      />
      <Route
        path='english/writing/:code/submissions/:submissionNumber'
        element={
          <Suspense fallback={<CollectionSkeleton rows={5} />}>
            <WritingFeedbackPage />
          </Suspense>
        }
      />
      <Route
        path='english/writing/:code/submissions/:submissionNumber/corrected-text'
        element={
          <Suspense fallback={<CollectionSkeleton rows={5} />}>
            <CorrectedWritingPage />
          </Suspense>
        }
      />
      <Route path='*' element={<NotFoundPage />} />
    </Route>
  </Routes>
);
