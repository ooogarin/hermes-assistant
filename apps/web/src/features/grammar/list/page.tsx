import { Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ContentState } from '../../../components/feedback/content-state';
import { PageHeader } from '../../../components/layout/page-header';

const GrammarListPage = () => (
  <div className='space-y-8'>
    <PageHeader
      actions={
        <Link
          className='inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-border-strong bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-subtle'
          to='/english/grammar/settings'
        >
          <Settings aria-hidden='true' size={18} />
          Pengaturan
        </Link>
      }
      description='Latihan grammar dalam mode practice atau exam.'
      title='Grammar'
    />
    <ContentState
      title='Daftar sesi belum tersedia'
      description='Pengaturan Grammar sudah dapat digunakan. Daftar sesi akan dihubungkan setelah API koleksi Grammar tersedia.'
    />
  </div>
);

export default GrammarListPage;
