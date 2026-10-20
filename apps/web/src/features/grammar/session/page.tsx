import { ArrowLeft } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QueryError } from '../../../components/feedback/query-error';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { GrammarSessionWorkspace } from '../../../components/grammar/grammar-session-workspace';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { getGrammarSession } from '../grammar-api';

const GrammarSessionPage = () => {
  const { code = '' } = useParams();
  const session = useApiQuery(code, (signal) => getGrammarSession(code, signal));
  const content = useMemo(() => {
    if (session.status === 'loading') return <CollectionSkeleton rows={5} />;
    if (session.status === 'error') {
      return (
        <QueryError
          error={session.error}
          notFound={{
            title: 'Sesi Grammar tidak ditemukan',
            description: 'Periksa kembali kode sesi yang dibuka.',
          }}
          onRetry={session.retry}
        />
      );
    }
    return <GrammarSessionWorkspace session={session.data} />;
  }, [session]);

  return (
    <div>
      <Link
        className='mb-7 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline'
        to='/english/grammar'
      >
        <ArrowLeft aria-hidden='true' size={18} />
        Semua Grammar
      </Link>
      {content}
    </div>
  );
};

export default GrammarSessionPage;
