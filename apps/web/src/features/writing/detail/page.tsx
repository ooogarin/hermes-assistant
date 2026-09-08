import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { EnglishSettingsLink } from '../../../components/english/english-settings-link';
import { ContentState, ErrorState } from '../../../components/feedback/content-state';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { WritingWorkspace } from '../../../components/writing/writing-workspace';
import { ApiError } from '../../../lib/api/api-error';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { getWritingMaterial } from '../writing-api';

const WritingDetailPage = () => {
  const { code = '' } = useParams();
  const material = useApiQuery(code, (signal) => getWritingMaterial(code, signal));

  return (
    <div>
      <div className='mb-8 flex flex-wrap items-center justify-between gap-4'>
        <Link
          className='inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline'
          to='/english/writing'
        >
          <ArrowLeft aria-hidden='true' size={18} />
          Semua Writing
        </Link>
        <EnglishSettingsLink to='/english/writing/settings' />
      </div>

      {material.status === 'loading' ? <CollectionSkeleton rows={5} /> : null}
      {material.status === 'error' ? (
        material.error instanceof ApiError && material.error.status === 404 ? (
          <ContentState title='Prompt Writing tidak ditemukan' description='Periksa kembali kode prompt dari Hermes.' />
        ) : (
          <ErrorState onRetry={material.retry} />
        )
      ) : null}
      {material.status === 'success' ? <WritingWorkspace material={material.data} /> : null}
    </div>
  );
};

export default WritingDetailPage;
