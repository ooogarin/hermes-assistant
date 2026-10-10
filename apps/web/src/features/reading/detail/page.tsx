import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EnglishSettingsLink } from '../../../components/english/english-settings-link';
import { ContentState, ErrorState } from '../../../components/feedback/content-state';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { ReadingWorkspace } from '../../../components/reading/reading-workspace';
import { ApiError } from '../../../lib/api/api-error';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { getReadingMaterial, markReadingMaterial, saveReadingAnswers } from '../reading-api';
import type { ReadingMaterial } from '../reading-api';

const ReadingDetailPage = () => {
  const { code = '' } = useParams();
  const material = useApiQuery(code, (signal) => getReadingMaterial(code, signal));
  const [savedMaterial, setSavedMaterial] = useState<ReadingMaterial>();
  const [submitting, setSubmitting] = useState(false);
  const [marking, setMarking] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [submitError, setSubmitError] = useState<string>();

  const submit = async (answers: Array<{ questionNumber: number; userAnswer: string | null }>) => {
    setSubmitting(true);
    setSubmitError(undefined);
    setNotice(undefined);
    try {
      setSavedMaterial(await saveReadingAnswers(code, answers));
      setNotice('Jawaban berhasil disimpan.');
      return true;
    } catch {
      setSubmitError('Jawaban belum dapat disimpan. Coba lagi.');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const current =
    savedMaterial?.code === code ? savedMaterial : material.status === 'success' ? material.data : undefined;
  const mark = async () => {
    if (!current) return;
    setMarking(true);
    setSubmitError(undefined);
    setNotice(undefined);
    try {
      setSavedMaterial(await markReadingMaterial(code, current.readingStatus === 'read' ? 'unread' : 'read'));
      setNotice(current.readingStatus === 'read' ? 'Bacaan ditandai belum dibaca.' : 'Bacaan ditandai sudah dibaca.');
    } catch {
      setSubmitError('Status baca belum dapat disimpan. Coba lagi.');
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className='space-y-5'>
      <div className='flex items-center justify-between gap-4'>
        <Link
          className='inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline'
          to='/english/reading'
        >
          <ArrowLeft aria-hidden='true' size={18} />
          Kembali ke Reading
        </Link>
        <EnglishSettingsLink to='/english/reading/settings' />
      </div>

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
      {notice ? (
        <p role='status' className='text-sm text-primary'>
          {notice}
        </p>
      ) : null}
      {material.status === 'success' && current ? (
        <ReadingWorkspace
          key={code}
          material={current}
          onSubmit={submit}
          onMark={() => void mark()}
          submitting={submitting}
          marking={marking}
        />
      ) : null}
    </div>
  );
};

export default ReadingDetailPage;
