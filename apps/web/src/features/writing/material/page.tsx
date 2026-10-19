import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { EnglishSettingsLink } from '../../../components/english/english-settings-link';
import { QueryError } from '../../../components/feedback/query-error';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { WritingWorkspace } from '../../../components/writing/writing-workspace';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { confirmDiscardChanges } from '../../../lib/hooks/use-unsaved-changes';
import { getWritingMaterial } from '../writing-api';

const WritingMaterialPage = () => {
  const { code = '' } = useParams();
  const material = useApiQuery(code, (signal) => getWritingMaterial(code, signal));

  return (
    <div>
      <div className='mb-8 flex flex-wrap items-center justify-between gap-4'>
        <Link
          className='inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline'
          onClick={(event) => {
            if (!confirmDiscardChanges()) {
              event.preventDefault();
            }
          }}
          to='/english/writing/materials'
        >
          <ArrowLeft aria-hidden='true' size={18} />
          Semua prompt
        </Link>
        <EnglishSettingsLink
          to='/english/writing/settings'
          onClick={(event) => {
            if (!confirmDiscardChanges()) {
              event.preventDefault();
            }
          }}
        />
      </div>

      {material.status === 'loading' ? <CollectionSkeleton rows={5} /> : null}
      {material.status === 'error' ? (
        <QueryError
          error={material.error}
          notFound={{
            title: 'Prompt Writing tidak ditemukan',
            description: 'Periksa kembali kode prompt dari Hermes.',
          }}
          onRetry={material.retry}
        />
      ) : null}
      {material.status === 'success' ? <WritingWorkspace key={code} material={material.data} /> : null}
    </div>
  );
};

export default WritingMaterialPage;
