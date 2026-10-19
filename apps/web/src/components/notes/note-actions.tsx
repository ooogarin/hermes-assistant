import { deleteNote } from '../../features/notes/notes-api';
import { RecordActions } from '../ui/record-actions';
import type { Note } from '../../features/notes/notes-api';

export const NoteActions = ({
  note,
  onDeleted,
  presentation = 'menu',
}: {
  note: Note;
  onDeleted: () => void;
  presentation?: 'menu' | 'buttons';
}) => (
  <RecordActions
    deleteError='Catatan belum dapat dihapus. Coba lagi.'
    editTo={`/notes/${note.code}/edit`}
    menuLabel='Aksi Notes'
    onDelete={() => deleteNote(note.code)}
    onDeleted={onDeleted}
    presentation={presentation}
    removalDescription='Catatan ini tidak akan muncul lagi di daftar Notes.'
    title={note.title}
  />
);
