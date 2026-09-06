import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { ReadingMeta } from './reading-meta';
import type { FormEvent } from 'react';
import type { ReadingMaterial } from '../../features/reading/reading-api';

type ReadingWorkspaceProps = {
  material: ReadingMaterial;
  onSubmit: (answers: Array<{ questionNumber: number; userAnswer: string }>) => Promise<void>;
  submitting: boolean;
};

export const ReadingWorkspace = ({ material, onSubmit, submitting }: ReadingWorkspaceProps) => {
  const [answers, setAnswers] = useState<Record<number, string>>(() =>
    Object.fromEntries(material.questions.map((question) => [question.questionNumber, question.userAnswer ?? ''])),
  );
  const [showValidation, setShowValidation] = useState(false);
  const completed = material.questions.every((question) => question.userAnswer !== null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const complete = material.questions.every((question) => answers[question.questionNumber]?.trim());
    setShowValidation(!complete);
    if (!complete) return;

    void onSubmit(
      material.questions.map((question) => ({
        questionNumber: question.questionNumber,
        userAnswer: answers[question.questionNumber].trim(),
      })),
    );
  };

  return (
    <div className='overflow-hidden rounded-surface border border-border bg-surface'>
      <ReadingMeta className='border-b border-border px-6 py-5 lg:px-8' material={material} />
      <div className='grid lg:grid-cols-[minmax(0,1fr)_minmax(28rem,1.05fr)]'>
        <article className='border-b border-border px-6 py-8 lg:border-b-0 lg:border-r lg:px-8'>
          <h2 className='text-2xl font-semibold tracking-tight text-ink'>{material.topic}</h2>
          <div className='mt-6 max-w-(--reading-width) whitespace-pre-wrap text-base leading-8 text-ink'>
            {material.passageText}
          </div>
        </article>

        <form className='px-6 py-8 lg:px-8' onSubmit={submit}>
          <div className='flex items-center justify-between gap-4'>
            <h2 className='text-lg font-semibold text-ink'>Pertanyaan</h2>
            <span className='text-sm text-ink-muted'>
              {material.questions.filter((question) => answers[question.questionNumber]?.trim()).length} dari{' '}
              {material.questions.length} dijawab
            </span>
          </div>

          <ol className='mt-6 space-y-6'>
            {material.questions.map((question) => {
              const empty = !answers[question.questionNumber]?.trim();
              return (
                <li key={question.questionNumber}>
                  <label
                    className='block text-sm font-medium leading-6 text-ink'
                    htmlFor={`answer-${question.questionNumber}`}
                  >
                    {question.questionNumber}. {question.questionText}
                  </label>
                  <textarea
                    id={`answer-${question.questionNumber}`}
                    className='mt-2 min-h-28 w-full resize-y rounded-control border border-border bg-surface px-3 py-2 text-sm leading-6 text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-surface-subtle'
                    disabled={completed || submitting}
                    value={answers[question.questionNumber] ?? ''}
                    aria-invalid={showValidation && empty}
                    onChange={(event) =>
                      setAnswers((current) => ({ ...current, [question.questionNumber]: event.target.value }))
                    }
                  />
                  {showValidation && empty ? (
                    <p className='mt-1 text-xs text-danger'>Jawaban ini wajib diisi.</p>
                  ) : null}
                </li>
              );
            })}
          </ol>

          {completed ? (
            <div className='mt-7 rounded-control bg-primary-subtle p-4 text-sm text-primary'>
              Jawaban sudah dikirim. Kamu dapat membandingkannya dengan jawaban acuan tanpa penilaian otomatis.
              <Link className='ml-1 font-semibold underline' to={`/english/reading/${material.code}/expected-answers`}>
                Lihat jawaban acuan
              </Link>
            </div>
          ) : (
            <Button className='mt-7 w-full' pending={submitting} type='submit'>
              Kirim jawaban
            </Button>
          )}
        </form>
      </div>
    </div>
  );
};
