import { Settings } from 'lucide-react';
import { ButtonLink } from '../ui/button-link';
import type { LinkProps } from 'react-router-dom';

export const EnglishSettingsLink = ({ to, onClick }: { to: string; onClick?: LinkProps['onClick'] }) => (
  <ButtonLink
    icon={<Settings aria-hidden='true' size={18} />}
    label='Pengaturan'
    onClick={onClick}
    to={to}
    variant='secondary'
  />
);
