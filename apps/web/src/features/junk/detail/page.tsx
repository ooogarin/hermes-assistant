import { ArrowLeft } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { NavigationNotice } from '../../../components/feedback/navigation-notice';
import { QueryError } from '../../../components/feedback/query-error';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { JunkActions } from '../../../components/junk/junk-actions';
import { JunkDetailPane } from '../../../components/junk/junk-detail-pane';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { getJunkItem } from '../junk-api';

const JunkDetailPage = () => {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo =
    typeof location.state?.returnTo === 'string' && /^\/junk(?:\?|$)/.test(location.state.returnTo)
      ? location.state.returnTo
      : '/junk';
  const detail = useApiQuery(code, (signal) => getJunkItem(code, signal));
  const onDeleted = () => {
    const destination = new URL(returnTo, window.location.origin);
    destination.searchParams.delete('preview');
    navigate(`${destination.pathname}${destination.search}`, {
      replace: true,
      state: { notice: 'Junk berhasil dihapus.' },
    });
  };
  return (
    <div className='space-y-4'>
      <NavigationNotice />
      <Link className='inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline' to={returnTo}>
        <ArrowLeft aria-hidden='true' size={18} />
        Kembali ke Junk
      </Link>
      {detail.status === 'loading' ? <CollectionSkeleton rows={4} /> : null}
      {detail.status === 'error' ? (
        <QueryError
          error={detail.error}
          notFound={{
            title: 'Junk tidak ditemukan',
            description: 'Item ini mungkin sudah tidak tersedia.',
          }}
          onRetry={detail.retry}
        />
      ) : null}
      {detail.status === 'success' ? (
        <JunkDetailPane
          key={code}
          item={detail.data}
          mode='page'
          actions={<JunkActions key={code} item={detail.data} onDeleted={onDeleted} presentation='buttons' />}
        />
      ) : null}
    </div>
  );
};
export default JunkDetailPage;
