import { Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import type { ReactNode } from 'react';

export type JunkCaptureMode = 'ai' | 'manual';

type JunkCaptureModeSwitchProps = {
  mode: JunkCaptureMode;
  onChange: (mode: JunkCaptureMode) => void;
};

const captureModes: Array<{ icon?: ReactNode; label: string; value: JunkCaptureMode }> = [
  { label: 'Manual', value: 'manual' },
  { icon: <Sparkles aria-hidden='true' size={16} />, label: 'Dengan AI', value: 'ai' },
];

export const JunkCaptureModeSwitch = ({ mode, onChange }: JunkCaptureModeSwitchProps) => (
  <fieldset aria-label='Jalur input Junk' className='mt-7 flex flex-wrap gap-2 border-0 p-0'>
    {captureModes.map((option) => (
      <Button
        aria-pressed={mode === option.value}
        icon={option.icon}
        key={option.value}
        label={option.label}
        onClick={() => onChange(option.value)}
        size='sm'
        variant={mode === option.value ? 'primary' : 'secondary'}
      />
    ))}
  </fieldset>
);
