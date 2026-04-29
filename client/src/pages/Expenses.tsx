import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Download, RefreshCw, Image, X, SlidersHorizontal } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { CalendarPicker } from '../components/ui/CalendarPicker';
import { ExpenseForm } from '../components/ExpenseForm';
import { getExpenses, createExpense, updateExpense, deleteExpense, exportExpenses, getCategories } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import type { Expense } from '../types';

type StatusFilter = '' | 'PENDING' | 'COMPLETED';
type PaymentTypeFilter = '' | 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD';

export function Expenses() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Filters
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined });
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<StatusFilter>('');
  const [paymentType, setPaymentType] = useState<PaymentTypeFilter>('');

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: getCategories });

  // Build query params from active filters
  const queryParams = (() => {
    const params: Record<string, string | number> = { page, limit: 20 };
    if (dateRange.from) {
      params.startDate = format(dateRange.from, 'yyyy-MM-dd');
      if (dateRange.to) params.endDate = format(dateRange.to, 'yyyy-MM-dd');
    } else {
      // Default to current month when no date range selected
      params.month = new Date().getMonth() + 1;
      params.year = new Date().getFullYear();
    }
    if (categoryId) params.categoryId = categoryId;
    if (status) params.paymentStatus = status;
    if (paymentType) params.paymentType = paymentType;
    return params;
  })();

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', queryParams],
    queryFn: () => getExpenses(queryParams),
  });

  const createMut = useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setShowForm(false);
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateExpense>[1] }) => updateExpense(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); setEditing(null); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });

  const clearAllFilters = () => {
    setDateRange({ from: undefined });
    setCategoryId('');
    setStatus('');
    setPaymentType('');
    setPage(1);
  };

  const activeFilterCount = [dateRange.from, categoryId, status, paymentType].filter(Boolean).length;

  const statusBadge = (s: string) =>
    s === 'COMPLETED'
      ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Completed</span>
      : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Pending</span>;

  const PAYMENT_TYPE_META: Record<string, { label: string; icon: string; cls: string }> = {
    CASH:          { label: 'Cash',     icon: '💵', cls: 'bg-emerald-50 text-emerald-700' },
    UPI:           { label: 'UPI',      icon: '📱', cls: 'bg-violet-50 text-violet-700' },
    BANK_TRANSFER: { label: 'Bank',     icon: '🏦', cls: 'bg-blue-50 text-blue-700' },
    CARD:          { label: 'Card',     icon: '💳', cls: 'bg-rose-50 text-rose-700' },
  };

  const paymentTypeBadge = (t: string | null) => {
    if (!t) return <span className="text-gray-300 text-xs">—</span>;
    const meta = PAYMENT_TYPE_META[t] ?? { label: t, icon: '💰', cls: 'bg-gray-100 text-gray-600' };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.cls}`}>
        {meta.icon} {meta.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500 mt-1">{data?.total ?? 0} entries</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => exportExpenses(queryParams as Record<string, string | number>)}>
            <Download size={14} /> Export CSV
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus size={14} /> Add Expense
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <SlidersHorizontal size={15} className="text-gray-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-500">Filters</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
              {activeFilterCount} active
            </span>
          )}
          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              <X size={12} /> Clear all
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-3 items-start">
          {/* Calendar date range picker */}
          <CalendarPicker
            value={dateRange}
            onChange={(r) => { setDateRange(r); setPage(1); }}
            onClear={() => { setDateRange({ from: undefined }); setPage(1); }}
          />

          {/* Category filter */}
          <div className="relative">
            <select
              value={categoryId}
              onChange={e => { setCategoryId(e.target.value); setPage(1); }}
              className={`pl-3 pr-8 py-2 rounded-lg border text-sm appearance-none transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                categoryId
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-700 font-medium'
                  : 'border-gray-300 bg-white text-gray-600'
              }`}
            >
              <option value="">All Categories</option>
              {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Payment status filter */}
          <div className="flex rounded-lg overflow-hidden border border-gray-300 text-sm">
            {(['', 'COMPLETED', 'PENDING'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => { setStatus(s); setPage(1); }}
                className={`px-3 py-2 font-medium transition-colors border-r last:border-r-0 border-gray-300 ${
                  status === s
                    ? s === 'COMPLETED'
                      ? 'bg-green-500 text-white'
                      : s === 'PENDING'
                        ? 'bg-amber-500 text-white'
                        : 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s === '' ? 'All' : s === 'COMPLETED' ? 'Completed' : 'Pending'}
              </button>
            ))}
          </div>

          {/* Payment type filter */}
          <div className="flex rounded-lg overflow-hidden border border-gray-300 text-sm">
            {([
              { value: '' as PaymentTypeFilter,        label: 'All',  icon: '' },
              { value: 'CASH' as PaymentTypeFilter,    label: 'Cash', icon: '💵' },
              { value: 'UPI' as PaymentTypeFilter,     label: 'UPI',  icon: '📱' },
              { value: 'BANK_TRANSFER' as PaymentTypeFilter, label: 'Bank', icon: '🏦' },
              { value: 'CARD' as PaymentTypeFilter,    label: 'Card', icon: '💳' },
            ]).map(({ value, label, icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => { setPaymentType(value); setPage(1); }}
                className={`px-3 py-2 font-medium transition-colors border-r last:border-r-0 border-gray-300 ${
                  paymentType === value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {icon ? `${icon} ${label}` : label}
              </button>
            ))}
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {dateRange.from && (
              <FilterChip
                label={`📅 ${format(dateRange.from, 'dd MMM')}${dateRange.to ? ` → ${format(dateRange.to, 'dd MMM yyyy')}` : ''}`}
                onRemove={() => { setDateRange({ from: undefined }); setPage(1); }}
              />
            )}
            {categoryId && (
              <FilterChip
                label={`Category: ${categories?.find(c => String(c.id) === categoryId)?.name ?? '...'}`}
                onRemove={() => { setCategoryId(''); setPage(1); }}
              />
            )}
            {status && (
              <FilterChip
                label={`Status: ${status}`}
                onRemove={() => { setStatus(''); setPage(1); }}
              />
            )}
            {paymentType && (
              <FilterChip
                label={`Type: ${PAYMENT_TYPE_META[paymentType]?.icon} ${PAYMENT_TYPE_META[paymentType]?.label}`}
                onRemove={() => { setPaymentType(''); setPage(1); }}
              />
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
        ) : data?.data.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No expenses match your filters</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Merchant</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Bill</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data?.data.map(expense => (
                  <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(expense.date)}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium max-w-[180px] truncate">
                      <span className="flex items-center gap-2">
                        {expense.description}
                        {expense.isRecurring && <RefreshCw size={12} className="text-indigo-400 flex-shrink-0" />}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={expense.category.name} color={expense.category.color} />
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-sm max-w-[100px] truncate">
                      {expense.merchant?.name ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">{paymentTypeBadge(expense.paymentType)}</td>
                    <td className="px-4 py-3">{statusBadge(expense.paymentStatus)}</td>
                    <td className="px-4 py-3 text-center">
                      {expense.billImagePath ? (
                        <button
                          onClick={() => setViewImage(expense.billImagePath!)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors"
                          title="View bill"
                        >
                          <Image size={14} className="text-indigo-600" />
                        </button>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setEditing(expense)} className="text-gray-400 hover:text-indigo-600 transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => { if (confirm('Delete this expense?')) deleteMut.mutate(expense.id); }}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {data && data.total > 20 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, data.total)} of {data.total}</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="secondary" size="sm" disabled={page * 20 >= data.total} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Add Expense">
        <ExpenseForm
          onSubmit={async (data) => createMut.mutateAsync(data)}
          onCancel={() => setShowForm(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Expense">
        {editing && (
          <ExpenseForm
            expense={editing}
            onSubmit={async (data) => updateMut.mutateAsync({ id: editing.id, data })}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      {/* Bill Image Viewer */}
      {viewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setViewImage(null)}
        >
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setViewImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X size={24} />
            </button>
            {viewImage.endsWith('.pdf')
              ? <iframe src={viewImage} className="w-full h-[80vh] rounded-xl" title="Bill PDF" />
              : <img src={viewImage} alt="Bill" className="w-full max-h-[80vh] object-contain rounded-xl shadow-2xl" />
            }
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
      {label}
      <button onClick={onRemove} className="text-gray-400 hover:text-red-500 transition-colors">
        <X size={11} />
      </button>
    </span>
  );
}
