import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { WritingDraftForm } from '../../../components/writing/writing-draft-form';
import { confirmDiscardChanges } from '../../../lib/hooks/use-unsaved-changes';

const WritingCreatePage = () => (
  <div className='mx-auto w-full max-w-4xl space-y-7'>
    <Link
      className='inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline'
      onClick={(event) => {
        if (!confirmDiscardChanges()) {
          event.preventDefault();
        }
      }}
      to='/english/writing'
    >
      <ArrowLeft aria-hidden='true' size={18} /> Kembali ke Writing
    </Link>
    <header className='border-b border-border pb-7'>
      <h1 className='text-3xl font-semibold tracking-tight text-ink sm:text-4xl'>Tulis bebas</h1>
      <p className='mt-3 text-sm leading-6 text-ink-muted'>
        Tulis tentang apa saja. Topik, genre, tags, dan level akan diestimasi saat kamu meminta analisis.
      </p>
    </header>
    <WritingDraftForm />
  </div>
);

export default WritingCreatePage;
