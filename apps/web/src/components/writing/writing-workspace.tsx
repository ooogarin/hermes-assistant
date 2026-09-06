import { useMemo, useState } from 'react';
import { WritingMeta } from './writing-meta';
import type { WritingMaterial } from '../../features/writing/writing-api';

const countWords = (value: string): number => {
  const trimmed = value.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
};

export const WritingWorkspace = ({ material }: { material: WritingMaterial }) => {
  const [draft, setDraft] = useState('');
  const wordCount = useMemo(() => countWords(draft), [draft]);

  return (
    <>
      <header>
        <h1 className='text-3xl font-semibold tracking-tight text-ink sm:text-4xl'>{material.topic}</h1>
        <p className='mt-2 text-base text-ink-muted'>{material.code}</p>
        <div className='mt-6'>
          <WritingMeta material={material} />
        </div>
      </header>

      <div className='mt-8 grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]'>
        <section className='rounded-surface border border-border bg-surface p-6 sm:p-8'>
          <h2 className='text-base font-semibold leading-7 text-ink'>{material.promptText}</h2>
          <label className='sr-only' htmlFor='writing-draft'>
            Draft tulisan
          </label>
          <textarea
            id='writing-draft'
            className='mt-5 min-h-96 w-full resize-y rounded-control border border-border bg-surface px-5 py-4 text-base leading-8 text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15'
            placeholder='Tulis jawabanmu di sini...'
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <p className='mt-3 text-sm text-ink-muted'>
            <strong className='text-primary'>{wordCount}</strong> / {material.targetWordCount} kata
          </p>
          <button
            className='mt-6 min-h-12 w-full rounded-control border border-primary bg-primary px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55'
            disabled
            title='API submission Writing masih mewajibkan hasil analisis lengkap dari Hermes.'
            type='button'
          >
            Kirim untuk dianalisis
          </button>
          <p className='mt-3 text-xs leading-5 text-ink-muted'>
            Pengiriman draft dari web menunggu endpoint yang menerima tulisan tanpa meminta hasil analisis dari browser.
          </p>
        </section>

        <aside className='rounded-surface border border-border bg-surface p-6 sm:p-8'>
          <h2 className='text-lg font-semibold text-ink'>Sebelum mengirim</h2>
          <ol className='mt-5 divide-y divide-border'>
            {[
              `Usahakan mendekati target ${material.targetWordCount} kata.`,
              `Pastikan jawaban sesuai dengan topik “${material.topic}”.`,
              `Gunakan genre ${material.genre}.`,
            ].map((item, index) => (
              <li key={item} className='flex gap-4 py-5 first:pt-0'>
                <span className='inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white'>
                  {index + 1}
                </span>
                <span className='text-sm leading-6 text-ink-muted'>{item}</span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </>
  );
};
