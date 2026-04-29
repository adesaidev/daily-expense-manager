import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Play, Pause, RefreshCw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { getRecurring, createRecurring, updateRecurring, deleteRecurring, processRecurring, getCategories } from '../lib/api';
import type { RecurringInput } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import type { Recurring } from '../types';
import { format } from 'date-fns';

const schema = z.object({
  amount: z.coerce.number().positive(),
  description: z.string().min(1),
  categoryId: z.coerce.number().int().positive(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  isActive: z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

export function RecurringPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Recurring | null>(null);

  const { data: items } = useQuery({ queryKey: ['recurring'], queryFn: getRecurring });

  const createMut = useMutation({
    mutationFn: (data: RecurringInput) => createRecurring(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recurring'] }); setShowForm(false); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: RecurringInput }) => updateRecurring(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recurring'] }); setEditing(null); },
  });
  const deleteMut = useMutation({
    mutationFn: deleteRecurring,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring'] }),
  });
  const processMut = useMutation({
    mutationFn: processRecurring,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['recurring'] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
      alert(`Processed: ${data.created} expense(s) created`);
    },
  });

  const freqColors: Record<string, string> = {
    DAILY: '#10b981', WEEKLY: '#3b82f6', MONTHLY: '#8b5cf6', YEARLY: '#f97316',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recurring Expenses</h1>
          <p className="text-sm text-gray-500 mt-1">Auto-tracked repeating expenses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => processMut.mutate()} disabled={processMut.isPending}>
            <RefreshCw size={14} className={processMut.isPending ? 'animate-spin' : ''} /> Process Now
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus size={14} /> Add Recurring
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {items?.map(item => (
          <Card key={item.id} className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-2 h-12 rounded-full ${item.isActive ? 'bg-green-400' : 'bg-gray-200'}`} />
              <div>
                <p className="font-medium text-gray-900">{item.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge label={item.frequency} color={freqColors[item.frequency]} />
                  <span className="text-xs text-gray-400">from {formatDate(item.startDate)}</span>
                  {item.lastRun && <span className="text-xs text-gray-400">last: {formatDate(item.lastRun)}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-bold text-gray-900">{formatCurrency(item.amount)}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => updateMut.mutate({ id: item.id, data: { isActive: !item.isActive } })}
                  className="text-gray-400 hover:text-indigo-600 p-1 transition-colors"
                  title={item.isActive ? 'Pause' : 'Resume'}
                >
                  {item.isActive ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button onClick={() => setEditing(item)} className="text-gray-400 hover:text-indigo-600 p-1 transition-colors">
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => { if (confirm('Delete this recurring expense?')) deleteMut.mutate(item.id); }}
                  className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </Card>
        ))}
        {items?.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">No recurring expenses set up yet</div>
        )}
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Add Recurring Expense">
        <RecurringForm onSubmit={async (data) => { await createMut.mutateAsync(data); }} onCancel={() => setShowForm(false)} />
      </Modal>
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Recurring Expense">
        {editing && (
          <RecurringForm
            item={editing}
            onSubmit={async (data) => { await updateMut.mutateAsync({ id: editing.id, data }); }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function RecurringForm({ item, onSubmit, onCancel }: { item?: Recurring; onSubmit: (d: RecurringInput) => Promise<void>; onCancel: () => void }) {
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: getCategories });
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: item
      ? { ...item, amount: Number(item.amount), startDate: format(new Date(item.startDate), "yyyy-MM-dd'T'HH:mm") }
      : { frequency: 'MONTHLY', startDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"), isActive: true },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
        <input type="number" step="0.01" {...register('amount')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <input type="text" {...register('description')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <select {...register('categoryId')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">Select category</option>
          {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
        <select {...register('frequency')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          {['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
        <input type="datetime-local" {...register('startDate')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">End Date (optional)</label>
        <input type="datetime-local" {...register('endDate')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Saving...' : item ? 'Update' : 'Add'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
