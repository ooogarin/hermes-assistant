import { Link } from 'react-router-dom';
import {
  grammarModeLabels,
  grammarSessionStatusLabels,
  grammarSourceLabels,
} from '../../features/grammar/grammar-display';
import { formatDate } from '../../lib/formatting/formatters';
import { ScrollTable, scrollTableRowClassName, scrollTableTitleClassName } from '../ui/scroll-table';
import type { GrammarSessionListItem } from '../../features/grammar/grammar-api';

const minimumWidth = 'min-w-[calc(clamp(9rem,22cqw,14rem)+50rem)]';
const columns = `grid ${minimumWidth} grid-cols-[clamp(9rem,22cqw,14rem)_6rem_8rem_8rem_9rem_7rem_6rem] gap-4`;

const badgeClassName = 'inline-flex shrink-0 whitespace-nowrap rounded-full border px-2 py-1 text-xs font-medium';
const primaryBadgeClassName = `${badgeClassName} border-primary/25 bg-primary-subtle text-primary`;
const neutralBadgeClassName = `${badgeClassName} border-border bg-surface-subtle text-ink-muted`;
const warningBadgeClassName = `${badgeClassName} border-amber-200 bg-amber-50 text-amber-700`;

const GrammarModeBadge = ({ mode }: { mode: GrammarSessionListItem['mode'] }) => (
  <span className={mode === 'practice' ? primaryBadgeClassName : neutralBadgeClassName}>{grammarModeLabels[mode]}</span>
);

const GrammarSessionStatusBadge = ({ status }: { status: GrammarSessionListItem['status'] }) => (
  <span
    className={
      status === 'active'
        ? primaryBadgeClassName
        : status === 'abandoned'
          ? warningBadgeClassName
          : neutralBadgeClassName
    }
  >
    {grammarSessionStatusLabels[status]}
  </span>
);

const scoreLabel = (item: GrammarSessionListItem): string =>
  item.score === null || item.maxScore === null ? '—' : `${item.score}/${item.maxScore}`;

export const GrammarSessionTable = ({ items }: { items: GrammarSessionListItem[] }) => (
  <ScrollTable
    columnsLabel='Kolom daftar sesi Grammar'
    countLabel={`Menampilkan ${items.length} sesi`}
    gridClassName={columns}
    headings={(frozenColumn) => (
      <>
        <span className={`${frozenColumn} bg-surface px-5 py-3 whitespace-nowrap`}>Sesi</span>
        <span className='py-3 whitespace-nowrap'>Mode</span>
        <span className='py-3 whitespace-nowrap'>Tanggal</span>
        <span className='py-3 whitespace-nowrap'>Level</span>
        <span className='py-3 whitespace-nowrap'>Sumber</span>
        <span className='py-3 whitespace-nowrap'>Status</span>
        <span className='py-3 pr-5 whitespace-nowrap'>Skor</span>
      </>
    )}
    label='Daftar sesi Grammar'
    minWidthClassName={minimumWidth}
  >
    {(frozenColumn) =>
      items.map((item) => (
        <li key={item.code} className='border-b border-border last:border-b-0'>
          <Link className={`${columns} ${scrollTableRowClassName}`} to={`/english/grammar/${item.code}`}>
            <div className={`${frozenColumn} ${scrollTableTitleClassName}`}>
              <h3 className='break-words text-sm font-semibold text-ink'>{item.code}</h3>
            </div>
            <div className='min-w-0 py-5'>
              <span className='sr-only'>Mode: </span>
              <GrammarModeBadge mode={item.mode} />
            </div>
            <div className='min-w-0 py-5 text-sm text-ink-muted'>
              <span className='sr-only'>Tanggal mulai: </span>
              <time dateTime={item.startedAt}>{formatDate(item.startedAt)}</time>
            </div>
            <div className='min-w-0 py-5 text-sm text-ink-muted'>
              <span className='sr-only'>Level: </span>
              <span className='break-words'>{item.level}</span>
            </div>
            <div className='min-w-0 py-5 text-sm text-ink-muted'>
              <span className='sr-only'>Sumber: </span>
              <span className='break-words'>{grammarSourceLabels[item.source]}</span>
            </div>
            <div className='min-w-0 py-5'>
              <span className='sr-only'>Status: </span>
              <GrammarSessionStatusBadge status={item.status} />
            </div>
            <div className='min-w-0 py-5 pr-5 text-sm text-ink-muted'>
              <span className='sr-only'>Skor: </span>
              <span className='whitespace-nowrap'>{scoreLabel(item)}</span>
            </div>
          </Link>
        </li>
      ))
    }
  </ScrollTable>
);
