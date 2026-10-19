import { deleteJunkItem } from '../../features/junk/junk-api';
import { getJunkTitle } from '../../features/junk/junk-display';
import { RecordActions } from '../ui/record-actions';
import type { JunkItem } from '../../features/junk/junk-api';

export const JunkActions = ({
  item,
  onDeleted,
  presentation = 'menu',
}: {
  item: JunkItem;
  onDeleted: () => void;
  presentation?: 'menu' | 'buttons';
}) => (
  <RecordActions
    deleteError='Junk belum dapat dihapus. Coba lagi.'
    editTo={`/junk/${item.code}/edit`}
    menuLabel='Aksi Junk'
    onDelete={() => deleteJunkItem(item.code)}
    onDeleted={onDeleted}
    presentation={presentation}
    removalDescription='Item ini tidak akan muncul lagi di daftar Junk.'
    title={getJunkTitle(item)}
  />
);
