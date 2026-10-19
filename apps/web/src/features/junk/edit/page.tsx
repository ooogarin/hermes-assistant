import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { QueryError } from '../../../components/feedback/query-error';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { JunkForm } from '../../../components/junk/junk-form';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { getJunkItem, updateJunkItem } from '../junk-api';
import type { JunkFormValues } from '../../../components/junk/junk-form';
import type { JunkItem, UpdateJunkInput } from '../junk-api';

const toFormValues = (item: JunkItem): JunkFormValues => ({
  category: item.category,
  contentText: item.contentText,
  sourceUrl: item.sourceUrl,
  sourceName: item.sourceName,
  tags: item.tags,
  title: item.title,
});

const JunkEditPage = () => {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const item = useApiQuery(`edit:${code}`, (signal) => getJunkItem(code, signal));

  const save = async (values: JunkFormValues, current: JunkItem) => {
    const input: UpdateJunkInput = {};
    if (values.title !== current.title) input.title = values.title;
    if (values.category !== current.category) input.category = values.category;
    if (values.contentText !== current.contentText) input.contentText = values.contentText;
    if (values.sourceUrl !== current.sourceUrl) input.sourceUrl = values.sourceUrl;
    if (values.sourceName !== current.sourceName) input.sourceName = values.sourceName;
    if (values.tags.join() !== current.tags.join()) input.tags = values.tags;
    await updateJunkItem(code, input);
    navigate(`/junk/${code}`, { replace: true, state: { notice: 'Junk berhasil diperbarui.' } });
  };

  return (
    <div className='mx-auto w-full max-w-4xl'>
      <Link
        className='inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline'
        to={`/junk/${code}`}
      >
        <ArrowLeft aria-hidden='true' size={18} /> Kembali ke detail
      </Link>
      <header className='mt-7 border-b border-border pb-7'>
        <h1 className='text-3xl font-semibold tracking-tight text-ink sm:text-4xl'>Edit Junk</h1>
      </header>
      {item.status === 'loading' ? (
        <div className='mt-7'>
          <CollectionSkeleton rows={5} />
        </div>
      ) : null}
      {item.status === 'error' ? (
        <div className='mt-7'>
          <QueryError
            error={item.error}
            notFound={{
              title: 'Junk tidak ditemukan',
              description: 'Item ini mungkin sudah tidak tersedia.',
            }}
            onRetry={item.retry}
          />
        </div>
      ) : null}
      {item.status === 'success' ? (
        <JunkForm
          cancelTo={`/junk/${code}`}
          hasRawText={Boolean(item.data.rawText?.trim())}
          initial={toFormValues(item.data)}
          onSubmit={(values) => save(values, item.data)}
          submitLabel='Simpan perubahan'
        />
      ) : null}
    </div>
  );
};

export default JunkEditPage;
