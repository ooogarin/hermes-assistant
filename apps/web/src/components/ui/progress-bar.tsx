type ProgressBarProps = {
  label: string;
  value: number;
};

const clamp = (value: number): number => Math.min(100, Math.max(0, value));

export const ProgressBar = ({ label, value }: ProgressBarProps) => {
  const safeValue = clamp(value);

  return (
    <div
      className='h-2 w-full overflow-hidden rounded-full bg-slate-200'
      role='progressbar'
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={safeValue}
    >
      <div className='h-full rounded-full bg-primary transition-[width]' style={{ width: `${safeValue}%` }} />
    </div>
  );
};
