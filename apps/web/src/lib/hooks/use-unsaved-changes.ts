import { useEffect } from 'react';

export const useUnsavedChanges = (dirty: boolean) => {
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  return () => !dirty || window.confirm('Perubahan belum disimpan. Tetap kembali?');
};
