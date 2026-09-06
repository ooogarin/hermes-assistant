import { BookOpen, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ContentState } from '../../../components/feedback/content-state';
import { PageHeader } from '../../../components/layout/page-header';
import { Button } from '../../../components/ui/button';

const ReadingListPage = () => (
  <div className='space-y-7'>
    <PageHeader
      title='Reading'
      description='Latihan pemahaman bacaan.'
      actions={
        <Link
          className='inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline'
          to='settings'
        >
          <Settings aria-hidden='true' size={18} />
          Pengaturan
        </Link>
      }
    />
    <ContentState
      icon={BookOpen}
      title='Daftar materi belum tersedia'
      description='API koleksi Reading belum menyediakan daftar, pencarian, dan filter. Materi yang kodenya sudah diketahui tetap dapat dibuka melalui tautan langsung dari Hermes.'
      action={
        <Link to='settings'>
          <Button variant='secondary'>Atur default Reading</Button>
        </Link>
      }
    />
  </div>
);

export default ReadingListPage;
