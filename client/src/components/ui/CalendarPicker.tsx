import { useEffect, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import type { DateRange } from 'react-day-picker';
import { format, isSameDay } from 'date-fns';
import { CalendarDays, X } from 'lucide-react';

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
  onClear: () => void;
}

export function CalendarPicker({ value, onChange, onClear }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const hasValue = value.from != null;
  const label = (() => {
    if (!value.from) return 'Pick date(s)';
    if (!value.to || isSameDay(value.from, value.to)) return format(value.from, 'dd MMM yyyy');
    return `${format(value.from, 'dd MMM')} → ${format(value.to, 'dd MMM yyyy')}`;
  })();

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
          hasValue
            ? 'border-indigo-400 bg-indigo-50 text-indigo-700 font-medium'
            : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
        }`}
      >
        <CalendarDays size={15} />
        <span>{label}</span>
        {hasValue && (
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="ml-1 text-indigo-400 hover:text-indigo-700"
          >
            <X size={12} />
          </span>
        )}
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-xl shadow-xl border border-gray-100 p-3">
          <DayPicker
            mode="range"
            selected={value}
            onSelect={(range) => {
              onChange(range ?? { from: undefined });
              // Close when full range selected
              if (range?.from && range?.to) setOpen(false);
            }}
            toDate={new Date()}
            showOutsideDays
            classNames={{
              months: 'flex flex-col',
              month: 'space-y-3',
              caption: 'flex justify-center relative items-center px-8',
              caption_label: 'text-sm font-semibold text-gray-800',
              nav: 'flex items-center',
              nav_button: 'h-7 w-7 bg-transparent hover:bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 transition-colors',
              nav_button_previous: 'absolute left-0',
              nav_button_next: 'absolute right-0',
              table: 'w-full border-collapse',
              head_row: 'flex',
              head_cell: 'text-gray-400 rounded w-9 font-normal text-xs text-center',
              row: 'flex w-full mt-1',
              cell: 'h-9 w-9 text-center text-sm relative focus-within:z-20',
              day: 'h-9 w-9 rounded-lg font-normal text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors',
              day_selected: 'bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white font-medium',
              day_today: 'text-indigo-600 font-bold',
              day_outside: 'text-gray-300',
              day_disabled: 'text-gray-200 cursor-not-allowed',
              day_range_middle: 'rounded-none bg-indigo-50 text-indigo-700',
              day_range_start: 'rounded-l-lg bg-indigo-600 text-white',
              day_range_end: 'rounded-r-lg bg-indigo-600 text-white',
              day_hidden: 'invisible',
            }}
          />
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-400">
              {!value.from ? 'Click to select start date'
                : !value.to ? 'Click to select end date'
                : `${format(value.from, 'dd MMM')} → ${format(value.to, 'dd MMM yyyy')}`}
            </span>
            <button
              type="button"
              onClick={() => { onClear(); setOpen(false); }}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
