import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDate, formatDisplayLabel } from '../../lib/formatting/formatters';
import { Button } from '../ui/button';
import { TagList } from '../ui/chip';
import { CopyButton } from '../ui/copy-button';
import { detailContentClassName } from '../ui/detail-layout';
import { Textarea } from '../ui/form-field';
import type { ReadingMaterial } from '../../features/reading/reading-api';

type ReadingWorkspaceProps = {
  material: ReadingMaterial;
  onSubmit: (answers: Array<{ questionNumber: number; userAnswer: string | null }>) => Promise<void>;
  onMark: () => void;
  submitting: boolean;
  marking: boolean;
};

export const ReadingWorkspace = ({ material, onSubmit, onMark, submitting, marking }: ReadingWorkspaceProps) => {
  const [answers, setAnswers] = useState<Record<number, string>>(() =>
    Object.fromEntries(material.questions.map((question) => [question.questionNumber, question.userAnswer ?? ''])),
  );
  const changes = material.questions.flatMap((question) => {
    const value = answers[question.questionNumber]?.trim() || null;
    return value === question.userAnswer ? [] : [{ questionNumber: question.questionNumber, userAnswer: value }];
  });
  return (
    <section className='w-full min-w-0 rounded-surface border border-border bg-surface'>
      <div className={detailContentClassName.page}>
        <header className='flex flex-wrap items-start justify-between gap-x-6 gap-y-4'>
          <h1 className='min-w-0 basis-full break-words text-2xl font-semibold tracking-tight text-ink sm:flex-1 sm:basis-0 sm:text-3xl'>
            {material.title}
          </h1>
          <Button
            variant='secondary'
            className='border-primary/50 text-primary'
            disabled={submitting}
            pending={marking}
            onClick={onMark}
          >
            {material.readingStatus === 'read' ? 'Tandai belum dibaca' : 'Tandai sudah dibaca'}
          </Button>
        </header>
        <p className='mt-3 text-sm text-ink-muted'>
          {material.level} · {formatDisplayLabel(material.genre)} · {material.wordCount} kata
        </p>
        <article
          aria-label='Isi bacaan'
          className='mt-9 whitespace-pre-wrap break-words text-base leading-8 text-ink sm:text-lg sm:leading-9'
        >
          {material.contentText}
        </article>
        {material.questions.length > 0 ? (
          <details className='group mt-10 border-y border-border'>
            <summary className='flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-primary'>
              <span>
                Pertanyaan opsional{' '}
                <span className='ml-2 font-normal text-ink-muted'>· {material.questions.length} soal</span>
              </span>
              <ChevronRight
                aria-hidden='true'
                size={20}
                className='shrink-0 transition-transform group-open:rotate-90'
              />
            </summary>
            <form
              className='pb-6'
              onSubmit={(event) => {
                event.preventDefault();
                if (changes.length) void onSubmit(changes);
              }}
            >
              <p className='text-sm leading-6 text-ink-muted'>
                Jawab sebagian, semuanya, atau lewati. Jawaban disimpan tanpa penilaian.
              </p>
              <fieldset className='mt-6 space-y-6' disabled={submitting || marking}>
                {material.questions.map((question) => (
                  <div key={question.questionNumber}>
                    <label
                      className='block text-sm font-medium leading-6 text-ink'
                      htmlFor={`answer-${question.questionNumber}`}
                    >
                      {question.questionNumber}. {question.questionText}
                    </label>
                    <Textarea
                      className='mt-2 min-h-24'
                      id={`answer-${question.questionNumber}`}
                      value={answers[question.questionNumber] ?? ''}
                      onChange={(event) =>
                        setAnswers((current) => ({ ...current, [question.questionNumber]: event.target.value }))
                      }
                    />
                  </div>
                ))}
              </fieldset>
              <div className='mt-6 flex flex-wrap items-center justify-between gap-4'>
                <Button type='submit' disabled={!changes.length || marking} pending={submitting}>
                  Simpan jawaban
                </Button>
                <Link
                  className='text-sm font-semibold text-primary hover:underline'
                  to={`/english/reading/${material.code}/expected-answers`}
                >
                  Lihat jawaban acuan
                </Link>
              </div>
            </form>
          </details>
        ) : null}
        <dl className='mt-8 grid grid-cols-[auto_minmax(0,1fr)] gap-x-8 gap-y-4 text-sm sm:grid-cols-[10rem_minmax(0,1fr)]'>
          <dt className='text-ink-muted'>Kode</dt>
          <dd className='flex flex-wrap items-center gap-2 text-ink'>
            {material.code}
            <CopyButton value={material.code} label='Salin kode' />
          </dd>
          <dt className='text-ink-muted'>Tanggal disimpan</dt>
          <dd>{formatDate(material.createdAt)}</dd>
          <dt className='text-ink-muted'>Dibuat melalui</dt>
          <dd>{material.source === 'cron' ? 'Terjadwal' : 'Permintaan'}</dd>
          <dt className='text-ink-muted'>Tags</dt>
          <dd>
            {material.tags.length ? (
              <TagList tags={material.tags} />
            ) : (
              <span className='text-ink-muted'>Belum ada tag</span>
            )}
          </dd>
        </dl>
      </div>
    </section>
  );
};
