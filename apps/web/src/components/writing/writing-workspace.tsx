import { getAllWritingSubmissions } from '../../features/writing/writing-api';
import { useApiQuery } from '../../lib/hooks/use-api-query';
import { ContentState, ErrorState } from '../feedback/content-state';
import { CollectionSkeleton } from '../feedback/skeleton';
import { CopyButton } from '../ui/copy-button';
import { detailContentClassName } from '../ui/detail-layout';
import { WritingDraftForm } from './writing-draft-form';
import { WritingMeta } from './writing-meta';
import { WritingSubmissionList } from './writing-submission-list';
import type { WritingMaterial } from '../../features/writing/writing-api';

export const WritingWorkspace = ({ material }: { material: WritingMaterial }) => {
  const submissions = useApiQuery(material.code, (signal) =>
    getAllWritingSubmissions({ materialCode: material.code, sort: 'newest' }, signal),
  );

  return (
    <div className='space-y-8'>
      <section className='min-w-0 w-full rounded-surface border border-border bg-surface' aria-label='Detail prompt'>
        <div className={detailContentClassName.page}>
          <h1 className='break-words text-2xl font-semibold tracking-tight text-ink sm:text-3xl'>{material.topic}</h1>
          <div className='mt-4 flex items-center gap-2 text-sm text-ink-muted'>
            <span>{material.code}</span>
            <CopyButton label='Salin kode prompt' value={material.code} />
          </div>
          <p className='mt-7 whitespace-pre-wrap text-base leading-8 text-ink'>{material.promptText}</p>
          <div className='mt-8 border-t border-border pt-6'>
            <WritingMeta material={material} />
          </div>
          <p className='mt-5 text-sm leading-6 text-ink-muted'>
            Kriteria prompt adalah panduan. Analisis akan memberi catatan singkat tentang kesesuaian tulisanmu.
          </p>
        </div>
      </section>
      <section className='mx-auto w-full max-w-4xl space-y-5' aria-labelledby='writing-response'>
        <h2 id='writing-response' className='text-lg font-semibold text-ink'>
          Tulis respons
        </h2>
        <WritingDraftForm materialCode={material.code} targetWordCount={material.targetWordCount} />
      </section>
      <section className='space-y-5 border-t border-border pt-7'>
        <h2 className='text-lg font-semibold text-ink'>Tulisan dari prompt ini</h2>
        {submissions.status === 'loading' ? <CollectionSkeleton rows={3} /> : null}
        {submissions.status === 'error' ? <ErrorState onRetry={submissions.retry} /> : null}
        {submissions.status === 'success' && submissions.data.length === 0 ? (
          <ContentState
            title='Belum ada tulisan'
            description='Tulisan yang kamu simpan dari prompt ini akan muncul di sini.'
          />
        ) : null}
        {submissions.status === 'success' && submissions.data.length > 0 ? (
          <WritingSubmissionList items={submissions.data} />
        ) : null}
      </section>
    </div>
  );
};
