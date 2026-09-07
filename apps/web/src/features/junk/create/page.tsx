import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { JunkForm } from '../../../components/junk/junk-form';
import { createJunkItem } from '../junk-api';
import type { JunkFormValues } from '../../../components/junk/junk-form';

const JunkCreatePage = () => {
  const navigate = useNavigate();
  const save = async (values: JunkFormValues) => {
    const item = await createJunkItem(values);
    navigate(`/junk/${item.code}`, { replace: true, state: { notice: 'Junk berhasil dibuat.' } });
  };

  return (
    <div className='mx-auto w-full max-w-4xl'>
      <Link className='inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline' to='/junk'>
        <ArrowLeft aria-hidden='true' size={18} /> Kembali ke Junk
      </Link>
      <header className='mt-7 border-b border-border pb-7'>
        <h1 className='text-3xl font-semibold tracking-tight text-ink sm:text-4xl'>Tambah Junk</h1>
        <p className='mt-3 max-w-2xl text-base leading-7 text-ink-muted'>
          Simpan tautan atau temuan ringan agar mudah dicari kembali.
        </p>
      </header>
      <JunkForm cancelTo='/junk' onSubmit={save} submitLabel='Simpan Junk' />
    </div>
  );
};

export default JunkCreatePage;
