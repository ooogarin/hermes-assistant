import { Link } from 'react-router-dom';
import { formatDate } from '../../lib/formatting/formatters';
import { ButtonLink } from '../ui/button-link';
import { detailContentClassName } from '../ui/detail-layout';
import type { ReactNode } from 'react';
import type { WritingAnalysis, WritingSubmission } from '../../features/writing/writing-api';

const Section = ({ children, title }: { children: ReactNode; title: string }) => (
  <section className='border-b border-border py-7 last:border-b-0'>
    <h2 className='text-lg font-semibold text-ink'>{title}</h2>
    <div className='mt-3 text-sm leading-7 text-ink-muted'>{children}</div>
  </section>
);

const BulletList = ({ items }: { items: string[] }) => (
  <ul className='list-disc space-y-2 pl-5'>
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

export const WritingFeedback = ({
  submission,
  analysis,
}: {
  submission: WritingSubmission;
  analysis: WritingAnalysis;
}) => {
  const correctedPath = `/english/writing/submissions/${submission.code}/corrected-text`;
  const adherenceLabels = {
    aligned: 'Sesuai',
    partially_aligned: 'Sebagian sesuai',
    not_aligned: 'Kurang sesuai',
  };

  return (
    <section className='min-w-0 w-full rounded-surface border border-border bg-surface'>
      <div className={detailContentClassName.page}>
        <header>
          <h1 className='text-2xl font-semibold tracking-tight text-ink sm:text-3xl'>Feedback tulisan</h1>
          <p className='mt-2 text-base text-ink-muted'>{submission.code}</p>
          <p className='mt-5 text-sm text-ink-muted'>
            {submission.wordCount} kata
            {submission.estimatedLevel === null ? '' : ` · Estimasi level ${submission.estimatedLevel}`}
            {submission.analyzedAt === null ? '' : ` · Dianalisis ${formatDate(submission.analyzedAt)}`}
          </p>
        </header>

        <nav className='mt-6 flex gap-6 border-b border-border' aria-label='Bagian feedback'>
          <span className='border-b-2 border-primary px-1 pb-3 text-sm font-semibold text-primary'>Feedback</span>
          <Link className='px-1 pb-3 text-sm font-medium text-ink-muted hover:text-ink' to={correctedPath}>
            Versi perbaikan
          </Link>
        </nav>

        <div className='grid lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.85fr)]'>
          <div className='lg:pr-8'>
            <Section title='Ringkasan'>
              <p>{analysis.summary.overallFeedback}</p>
            </Section>
            <Section title='Prioritas perbaikan'>
              <BulletList items={analysis.summary.priorityImprovements} />
            </Section>
            <Section title={`Grammar · ${analysis.grammar.errorCount} temuan`}>
              {analysis.grammar.items.length === 0 ? (
                <p>Tidak ada koreksi grammar.</p>
              ) : (
                <div className='overflow-x-auto'>
                  <table className='w-full min-w-[34rem] text-left'>
                    <thead>
                      <tr className='border-b border-border text-xs'>
                        <th className='pb-2 pr-4 font-medium'>Asli</th>
                        <th className='pb-2 pr-4 font-medium'>Perbaikan</th>
                        <th className='pb-2 font-medium'>Alasan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.grammar.items.map((item) => (
                        <tr
                          key={`${item.original}-${item.corrected}`}
                          className='border-b border-border last:border-b-0'
                        >
                          <td className='align-top py-3 pr-4'>{item.original}</td>
                          <td className='align-top py-3 pr-4 font-medium text-primary'>{item.corrected}</td>
                          <td className='align-top py-3'>{item.explanation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
            <Section title='Vocabulary'>
              <div className='space-y-5'>
                {analysis.vocabulary.repeatedWords.map((item) => (
                  <p key={item.word}>
                    <strong className='text-ink'>{item.word}</strong> ({item.count}×): {item.suggestions.join(', ')}
                  </p>
                ))}
                {analysis.vocabulary.betterPhrases.map((item) => (
                  <p key={item.original}>
                    <strong className='text-ink'>{item.original}</strong> → {item.suggestions.join(', ')}
                  </p>
                ))}
                {analysis.vocabulary.newUsefulWords.map((item) => (
                  <p key={item.word}>
                    <strong className='text-primary'>{item.word}</strong> — {item.meaning}.{' '}
                    <span className='italic'>{item.example}</span>
                  </p>
                ))}
                {analysis.vocabulary.repeatedWords.length +
                  analysis.vocabulary.betterPhrases.length +
                  analysis.vocabulary.newUsefulWords.length ===
                0 ? (
                  <p>Tidak ada catatan vocabulary.</p>
                ) : null}
              </div>
            </Section>
            <ButtonLink label='Lihat versi perbaikan' to={correctedPath} variant='secondary' />
          </div>

          <aside className='mt-8 border-t border-border lg:mt-0 lg:border-l lg:border-t-0 lg:pl-8'>
            <Section title='Kekuatan'>
              <BulletList items={analysis.summary.strengths} />
            </Section>
            <Section title='Structure'>
              <p>{analysis.structure.feedback}</p>
              <div className='mt-3'>
                <BulletList items={analysis.structure.suggestions} />
              </div>
            </Section>
            {analysis.promptAdherence === null ? null : (
              <Section title='Kesesuaian dengan prompt'>
                <p className='font-medium text-ink'>{adherenceLabels[analysis.promptAdherence.status]}</p>
                <p className='mt-2'>{analysis.promptAdherence.notes}</p>
              </Section>
            )}
            <Section title='Langkah berikutnya'>
              <ol className='space-y-4'>
                {analysis.nextSteps.map((step, index) => (
                  <li key={step} className='flex gap-3'>
                    <span className='inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white'>
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </Section>
          </aside>
        </div>
      </div>
    </section>
  );
};
