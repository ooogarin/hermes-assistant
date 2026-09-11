import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EnglishSettingsLink } from '../../../components/english/english-settings-link';
import { ContentState, ErrorState } from '../../../components/feedback/content-state';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { PageHeader } from '../../../components/layout/page-header';
import { ReadingWorkspace } from '../../../components/reading/reading-workspace';
import { ApiError } from '../../../lib/api/api-error';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { getReadingMaterial, submitReadingAnswers } from '../reading-api';
import type { ReadingMaterial } from '../reading-api';

const ReadingDetailPage = () => {
  const { code = '' } = useParams();
  const material = useApiQuery(code, (signal) => getReadingMaterial(code, signal));
  const [savedMaterial, setSavedMaterial] = useState<ReadingMaterial>();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  const submit = async (answers: Array<{ questionNumber: number; userAnswer: string }>) => {
    setSubmitting(true);
    setSubmitError(undefined);
    try {
      setSavedMaterial(await submitReadingAnswers(code, answers));
    } catch (error) {
      setSubmitError(
        error instanceof ApiError && error.status === 409
          ? 'Jawaban untuk materi ini sudah pernah dikirim.'
          : 'Jawaban belum dapat dikirim. Coba lagi.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className='space-y-7'>
      <Link
        className='inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline'
        to='/english/reading'
      >
        <ArrowLeft aria-hidden='true' size={18} />
        Semua Reading
      </Link>
      <PageHeader title='Reading' actions={<EnglishSettingsLink to='/english/reading/settings' />} />

      {material.status === 'loading' ? <CollectionSkeleton rows={5} /> : null}
      {material.status === 'error' ? (
        material.error instanceof ApiError && material.error.status === 404 ? (
          <ContentState
            title='Materi Reading tidak ditemukan'
            description='Periksa kembali kode materi dari Hermes.'
            action={
              <Link className='font-semibold text-primary hover:underline' to='/english/reading'>
                Kembali ke Reading
              </Link>
            }
          />
        ) : (
          <ErrorState onRetry={material.retry} />
        )
      ) : null}
      {submitError === undefined ? null : (
        <p
          className='rounded-control border border-danger/25 bg-danger-subtle px-4 py-3 text-sm text-danger'
          role='alert'
        >
          {submitError}
        </p>
      )}
      {material.status === 'success' ? (
        <ReadingWorkspace material={savedMaterial ?? material.data} onSubmit={submit} submitting={submitting} />
      ) : null}
    </div>
  );
};

export default ReadingDetailPage;
