import { Settings } from 'lucide-react';
import { ButtonLink } from '../ui/button-link';

export const EnglishSettingsLink = ({ to }: { to: string }) => (
  <ButtonLink icon={<Settings aria-hidden='true' size={18} />} label='Pengaturan' to={to} variant='secondary' />
);
