import { Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate } from '../../lib/formatting/formatters';
import { Button } from '../ui/button';
import { ButtonLink } from '../ui/button-link';
import { CopyButton } from '../ui/copy-button';
import { detailContentClassName } from '../ui/detail-layout';
import { ResponsiveTags } from '../ui/responsive-tags';
import { WritingStatusLabel } from './writing-status-label';
import type { WritingSubmission } from '../../features/writing/writing-api';

const metadataRowClassName = 'grid min-h-7 grid-cols-[8rem_minmax(0,1fr)] items-start gap-3';

export const WritingSubmissionDetail = ({ submission }: { submission: WritingSubmission }) => {
  const analyzed = submission.analysis !== null;
  const detailPath = `/english/writing/submissions/${submission.code}`;

  return (
    <section className='min-w-0 w-full rounded-surface border border-border bg-surface' aria-label='Detail tulisan'>
      <div className={detailContentClassName.page}>
        <header className='flex flex-wrap items-start justify-between gap-x-6 gap-y-4'>
          <h1 className='min-w-0 flex-1 break-words text-2xl font-semibold tracking-tight text-ink sm:text-3xl'>
            {submission.estimatedTopic ?? 'Tulisan'}
          </h1>
          <ButtonLink
            icon={<Pencil aria-hidden='true' size={18} />}
            label={analyzed ? 'Edit metadata' : 'Edit tulisan'}
            to={`${detailPath}/edit`}
            variant='secondary'
          />
        </header>
        <div className='mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-muted'>
          <WritingStatusLabel status={submission.analysisStatus} />
          <span>{submission.wordCount} kata</span>
        </div>
        <article
          aria-label='Tulisan asli'
          className='mt-7 whitespace-pre-wrap break-words text-base leading-8 text-ink'
        >
          {submission.originalText}
        </article>
        <div className='mt-8 grid gap-7 border-t border-border pt-6 xl:grid-cols-2'>
          <section aria-label='Informasi tulisan'>
            <h2 className='mb-4 text-base font-semibold text-ink'>Informasi tulisan</h2>
            <dl className='space-y-2 text-sm'>
              <div className={metadataRowClassName}>
                <dt className='text-ink-muted'>Kode</dt>
                <dd className='flex min-w-0 flex-wrap items-center gap-2'>
                  <span className='break-all text-ink-muted'>{submission.code}</span>
                  <CopyButton label='Salin kode tulisan' value={submission.code} />
                </dd>
              </div>
              <div className={metadataRowClassName}>
                <dt className='text-ink-muted'>Jenis</dt>
                <dd>{submission.materialCode === null ? 'Tulisan bebas' : 'Dari prompt'}</dd>
              </div>
              {submission.materialCode === null ? null : (
                <div className={metadataRowClassName}>
                  <dt className='text-ink-muted'>Prompt</dt>
                  <dd>
                    <Link
                      className='break-all font-medium text-primary hover:underline'
                      to={`/english/writing/materials/${submission.materialCode}`}
                    >
                      {submission.materialCode}
                    </Link>
                  </dd>
                </div>
              )}
              <div className={metadataRowClassName}>
                <dt className='text-ink-muted'>Tanggal disimpan</dt>
                <dd>
                  <time dateTime={submission.createdAt}>{formatDate(submission.createdAt)}</time>
                </dd>
              </div>
              {submission.updatedAt === submission.createdAt ? null : (
                <div className={metadataRowClassName}>
                  <dt className='text-ink-muted'>Diperbarui</dt>
                  <dd>
                    <time dateTime={submission.updatedAt}>{formatDate(submission.updatedAt)}</time>
                  </dd>
                </div>
              )}
              {submission.analyzedAt === null ? null : (
                <div className={metadataRowClassName}>
                  <dt className='text-ink-muted'>Dianalisis</dt>
                  <dd>
                    <time dateTime={submission.analyzedAt}>{formatDate(submission.analyzedAt)}</time>
                  </dd>
                </div>
              )}
            </dl>
          </section>
          <section aria-label='Metadata estimasi'>
            <h2 className='mb-4 text-base font-semibold text-ink'>Metadata estimasi</h2>
            <dl className='space-y-2 text-sm'>
              {[
                ['Topik', submission.estimatedTopic],
                ['Genre', submission.estimatedGenre],
                ['Level', submission.estimatedLevel],
              ].map(([label, value]) => (
                <div key={label} className={metadataRowClassName}>
                  <dt className='text-ink-muted'>{label}</dt>
                  <dd className='min-w-0 break-words'>{value ?? 'Belum diestimasi'}</dd>
                </div>
              ))}
              <div className={metadataRowClassName}>
                <dt className='text-ink-muted'>Tags</dt>
                <dd className='min-w-0'>
                  {submission.estimatedTags === null ? (
                    'Belum diestimasi'
                  ) : submission.estimatedTags.length === 0 ? (
                    'Tanpa tag'
                  ) : (
                    <ResponsiveTags label='Tag tulisan' tags={submission.estimatedTags} />
                  )}
                </dd>
              </div>
            </dl>
          </section>
        </div>
        <section className='mt-7 space-y-3 border-t border-border pt-6'>
          {analyzed ? (
            <>
              <ButtonLink label='Lihat feedback' to={`${detailPath}/feedback`} />
              <p className='text-sm leading-6 text-ink-muted'>
                Teks dikunci setelah analisis. Metadata estimasi tetap bisa diedit.
              </p>
            </>
          ) : (
            <>
              <Button aria-describedby='writing-analysis-help' disabled>
                Analisis tulisan
              </Button>
              <p className='text-sm leading-6 text-ink-muted' id='writing-analysis-help'>
                Analisis tersedia melalui perintah langsung di Telegram. Sertakan kode{' '}
                <strong>{submission.code}</strong> saat meminta Hermes menganalisis tulisanmu. Teks masih bisa diedit
                sebelum dianalisis.
              </p>
            </>
          )}
        </section>
      </div>
    </section>
  );
};
