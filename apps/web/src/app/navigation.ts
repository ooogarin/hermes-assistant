import { BookOpen, Landmark, LayoutGrid, NotebookPen, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type NavigationChild = {
  label: string;
  to: string;
};

export type NavigationItem = {
  children?: NavigationChild[];
  icon: LucideIcon;
  label: string;
  to?: string;
};

export const navigationItems: NavigationItem[] = [
  { label: 'Ringkasan', to: '/', icon: LayoutGrid },
  { label: 'Finance', to: '/finance', icon: Landmark },
  {
    label: 'English',
    icon: BookOpen,
    children: [
      { label: 'General English', to: '/english/general' },
      { label: 'Grammar', to: '/english/grammar' },
      { label: 'Reading', to: '/english/reading' },
      { label: 'Writing', to: '/english/writing' },
    ],
  },
  { label: 'Notes', to: '/notes', icon: NotebookPen },
  { label: 'Junk', to: '/junk', icon: Trash2 },
];
