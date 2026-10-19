import { useEffect } from 'react';

const discardMessage = 'Perubahan belum disimpan. Tetap kembali?';

const dirtyForms = new Set<symbol>();

export const confirmDiscardChanges = (): boolean => dirtyForms.size === 0 || window.confirm(discardMessage);

export const useUnsavedChanges = (dirty: boolean) => {
  useEffect(() => {
    if (!dirty) {
      return;
    }

    const form = Symbol('dirty-form');
    dirtyForms.add(form);
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);

    return () => {
      dirtyForms.delete(form);
      window.removeEventListener('beforeunload', warn);
    };
  }, [dirty]);

  return () => !dirty || window.confirm(discardMessage);
};
