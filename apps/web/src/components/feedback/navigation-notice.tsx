import { CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

type NoticeState = { notice?: string } | null;

export const NavigationNotice = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [notice] = useState(() => (location.state as NoticeState)?.notice);

  useEffect(() => {
    if ((location.state as NoticeState)?.notice === undefined) return;
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [location.pathname, location.search, location.state, navigate]);

  if (notice === undefined) return null;

  return (
    <p
      className='flex items-center gap-2 rounded-control border border-primary/25 bg-primary-subtle px-4 py-3 text-sm font-medium text-primary'
      role='status'
    >
      <CheckCircle2 aria-hidden='true' size={18} />
      {notice}
    </p>
  );
};
