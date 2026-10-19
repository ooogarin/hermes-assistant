import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ContentState } from '../../../components/feedback/content-state';
import { QueryError } from '../../../components/feedback/query-error';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { ButtonLink } from '../../../components/ui/button-link';
import { WritingFeedback } from '../../../components/writing/writing-feedback';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { getWritingSubmission } from '../writing-api';

const WritingFeedbackPage = () => {
  const { code = '' } = useParams();
  const submission = useApiQuery(code, (signal) => getWritingSubmission(code, signal));

  return (
    <div>
      <Link
        className='mb-7 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline'
        to={`/english/writing/submissions/${code}`}
      >
        <ArrowLeft aria-hidden='true' size={18} />
        Kembali ke tulisan
      </Link>
      {submission.status === 'loading' ? <CollectionSkeleton rows={5} /> : null}
      {submission.status === 'error' ? (
        <QueryError
          error={submission.error}
          notFound={{
            title: 'Tulisan tidak ditemukan',
            description: 'Tulisan ini mungkin sudah tidak tersedia.',
          }}
          onRetry={submission.retry}
        />
      ) : null}
      {submission.status === 'success' ? (
        submission.data.analysis === null ? (
          <ContentState
            title='Tulisan belum dianalisis'
            description='Minta analisis melalui perintah langsung ke Hermes di Telegram dengan kode tulisan ini.'
            action={
              <ButtonLink label='Lihat tulisan' to={`/english/writing/submissions/${code}`} variant='secondary' />
            }
          />
        ) : (
          <WritingFeedback submission={submission.data} analysis={submission.data.analysis} />
        )
      ) : null}
    </div>
  );
};

export default WritingFeedbackPage;
