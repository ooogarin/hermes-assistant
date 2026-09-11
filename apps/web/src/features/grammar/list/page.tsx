import { EnglishSettingsLink } from '../../../components/english/english-settings-link';
import { ContentState } from '../../../components/feedback/content-state';
import { PageHeader } from '../../../components/layout/page-header';

const GrammarListPage = () => (
  <div className='space-y-8'>
    <PageHeader actions={<EnglishSettingsLink to='/english/grammar/settings' />} title='Grammar' />
    <ContentState
      title='Daftar sesi belum tersedia'
      description='Pengaturan Grammar sudah dapat digunakan. Daftar sesi akan dihubungkan setelah API koleksi Grammar tersedia.'
    />
  </div>
);

export default GrammarListPage;
