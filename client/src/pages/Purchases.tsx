import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ChevronDown, ChevronUp, ShoppingCart } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { getPurchases, createPurchase, updatePurchase, deletePurchase, getMerchants, getSKUs } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import type { Purchase, PurchaseStatus } from '../types';

const itemSchema = z.object({
  skuId: z.coerce.number().int().positive('Select a SKU'),
  quantity: z.coerce.number().positive('Must be > 0'),
  unitPrice: z.coerce.number().min(0, 'Must be ≥ 0'),
});

const schema = z.object({
  merchantId: z.coerce.number().int().positive().optional().nullable(),
  date: z.string().min(1),
  notes: z.string().optional().nullable(),
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']),
  items: z.array(itemSchema).min(1, 'Add at least one item'),
});
type FormData = z.infer<typeof schema>;

const STATUS_META: Record<PurchaseStatus, { label: string; cls: string }> = {
  PENDING:   { label: 'Pending',   cls: 'bg-amber-100 text-amber-700' },
  COMPLETED: { label: 'Completed', cls: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-red-100 text-red-600' },
};

function StatusBadge({ status }: { status: PurchaseStatus }) {
  const m = STATUS_META[status];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${m.cls}`}>{m.label}</span>;
}

function PurchaseForm({ purchase, onSubmit, onCancel }: {
  purchase?: Purchase;
  onSubmit: (d: FormData) => Promise<void>;
  onCancel: () => void;
}) {
  const { data: merchants = [] } = useQuery({ queryKey: ['merchants'], queryFn: getMerchants });
  const { data: skus = [] } = useQuery({ queryKey: ['skus'], queryFn: getSKUs });

  const { register, control, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: purchase ? {
      merchantId: purchase.merchantId ?? null,
      date: format(new Date(purchase.date), "yyyy-MM-dd'T'HH:mm"),
      notes: purchase.notes ?? '',
      status: purchase.status,
      items: purchase.items.map(i => ({ skuId: i.skuId, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })),
    } : {
      date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      status: 'COMPLETED',
      items: [{ skuId: 0, quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = watch('items');

  const total = watchedItems.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
  const status = watch('status');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Merchant <span className="text-gray-400 font-normal">(optional)</span></label>
          <select {...register('merchantId')} className={inputCls}>
            <option value="">No merchant</option>
            {merchants.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
          <input type="datetime-local" {...register('date')} className={inputCls} />
        </div>
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
        <div className="flex rounded-lg overflow-hidden border border-gray-300 text-sm">
          {(['PENDING', 'COMPLETED', 'CANCELLED'] as PurchaseStatus[]).map(s => (
            <label key={s} className={`flex-1 text-center py-2 font-medium cursor-pointer transition-colors border-r last:border-r-0 border-gray-300 ${
              status === s
                ? s === 'COMPLETED' ? 'bg-green-500 text-white' : s === 'PENDING' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}>
              <input type="radio" {...register('status')} value={s} className="sr-only" />
              {STATUS_META[s].label}
            </label>
          ))}
        </div>
      </div>

      {/* Line items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Items</label>
          <button type="button" onClick={() => append({ skuId: 0, quantity: 1, unitPrice: 0 })}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
            <Plus size={12} /> Add item
          </button>
        </div>
        {errors.items?.root && <p className="text-red-500 text-xs mb-2">{errors.items.root.message}</p>}
        <div className="space-y-2">
          {fields.map((field, idx) => (
            <div key={field.id} className="flex gap-2 items-start">
              <div className="flex-1">
                <select {...register(`items.${idx}.skuId`)} className={inputCls}>
                  <option value={0}>Select SKU</option>
                  {skus.map(s => <option key={s.id} value={s.id}>{s.name} ({s.unit}) — stock: {Number(s.currentStock).toFixed(2)}</option>)}
                </select>
                {errors.items?.[idx]?.skuId && <p className="text-red-500 text-xs mt-0.5">{errors.items[idx]?.skuId?.message}</p>}
              </div>
              <div className="w-24">
                <input type="number" step="0.01" placeholder="Qty" {...register(`items.${idx}.quantity`)} className={inputCls} />
              </div>
              <div className="w-28">
                <input type="number" step="0.01" placeholder="Unit ₹" {...register(`items.${idx}.unitPrice`)} className={inputCls} />
              </div>
              <div className="w-24 px-2 py-2 text-sm text-gray-600 text-right font-medium">
                {formatCurrency((Number(watchedItems[idx]?.quantity) || 0) * (Number(watchedItems[idx]?.unitPrice) || 0))}
              </div>
              {fields.length > 1 && (
                <button type="button" onClick={() => remove(idx)} className="text-gray-300 hover:text-red-500 pt-2.5 transition-colors">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-2 pt-2 border-t border-gray-100">
          <span className="text-sm font-semibold text-gray-900">Total: {formatCurrency(total)}</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
        <input {...register('notes')} className={inputCls} placeholder="Any notes..." />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Saving...' : purchase ? 'Update Purchase' : 'Create Purchase'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

export function Purchases() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Purchase | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['purchases', { page, status: statusFilter }],
    queryFn: () => getPurchases({ page, limit: 20, ...(statusFilter ? { status: statusFilter } : {}) }),
  });

  const createMut = useMutation({
    mutationFn: createPurchase,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchases'] }); qc.invalidateQueries({ queryKey: ['skus'] }); setShowForm(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updatePurchase>[1] }) => updatePurchase(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchases'] }); qc.invalidateQueries({ queryKey: ['skus'] }); setEditing(null); },
  });

  const deleteMut = useMutation({
    mutationFn: deletePurchase,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchases'] }); qc.invalidateQueries({ queryKey: ['skus'] }); },
  });

  const [error, setError] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchases</h1>
          <p className="text-sm text-gray-500 mt-1">{data?.total ?? 0} orders</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus size={14} /> New Purchase
        </Button>
      </div>

      {/* Status filter */}
      <div className="flex rounded-lg overflow-hidden border border-gray-300 text-sm w-fit">
        {(['', 'COMPLETED', 'PENDING', 'CANCELLED'] as const).map(s => (
          <button key={s} type="button" onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-4 py-2 font-medium transition-colors border-r last:border-r-0 border-gray-300 ${
              statusFilter === s
                ? s === 'COMPLETED' ? 'bg-green-500 text-white' : s === 'PENDING' ? 'bg-amber-500 text-white' : s === 'CANCELLED' ? 'bg-red-500 text-white' : 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}>
            {s === '' ? 'All' : STATUS_META[s as PurchaseStatus].label}
          </button>
        ))}
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{error}</div>}

      {isLoading ? (
        <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
      ) : data?.data.length === 0 ? (
        <Card className="p-12 text-center">
          <ShoppingCart size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No purchases yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {data?.data.map(purchase => (
            <Card key={purchase.id} className="p-0 overflow-hidden">
              <div className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-gray-900">{formatCurrency(Number(purchase.totalAmount))}</span>
                    <StatusBadge status={purchase.status} />
                    {purchase.merchant && <span className="text-sm text-gray-500">from {purchase.merchant.name}</span>}
                    <span className="text-xs text-gray-400">{formatDate(purchase.date)}</span>
                  </div>
                  {purchase.notes && <p className="text-xs text-gray-400 mt-0.5">{purchase.notes}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-400">{purchase.items.length} item{purchase.items.length !== 1 ? 's' : ''}</span>
                  <button onClick={() => setEditing(purchase)} className="text-gray-400 hover:text-indigo-600 transition-colors p-1">
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => { if (confirm('Delete this purchase? Stock will be reversed.')) deleteMut.mutate(purchase.id); }}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  ><Trash2 size={14} /></button>
                  <button
                    onClick={() => setExpanded(expanded === purchase.id ? null : purchase.id)}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                  >
                    {expanded === purchase.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>
              {expanded === purchase.id && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-400 uppercase">
                        <th className="text-left pb-2 font-medium">SKU</th>
                        <th className="text-right pb-2 font-medium">Qty</th>
                        <th className="text-right pb-2 font-medium">Unit Price</th>
                        <th className="text-right pb-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {purchase.items.map(item => (
                        <tr key={item.id}>
                          <td className="py-1.5 text-gray-700">{item.sku.name}</td>
                          <td className="py-1.5 text-right text-gray-600">{Number(item.quantity)} {item.sku.unit}</td>
                          <td className="py-1.5 text-right text-gray-600">{formatCurrency(Number(item.unitPrice))}</td>
                          <td className="py-1.5 text-right font-medium text-gray-900">{formatCurrency(Number(item.totalPrice))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {data && data.total > 20 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, data.total)} of {data.total}</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="secondary" size="sm" disabled={page * 20 >= data.total} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="New Purchase Order" size="lg">
        <PurchaseForm
          onSubmit={async (data) => {
            setError('');
            try {
              await createMut.mutateAsync({
                ...data,
                date: new Date(data.date).toISOString(),
                merchantId: data.merchantId || null,
              });
            } catch (e: any) {
              setError(e?.response?.data?.message ?? e?.message ?? 'Failed to create purchase');
              throw e;
            }
          }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Purchase Order" size="lg">
        {editing && (
          <PurchaseForm
            purchase={editing}
            onSubmit={async (data) => {
              setError('');
              try {
                await updateMut.mutateAsync({
                  id: editing.id,
                  data: { ...data, date: new Date(data.date).toISOString(), merchantId: data.merchantId || null },
                });
              } catch (e: any) {
                setError(e?.response?.data?.message ?? e?.message ?? 'Failed to update purchase');
                throw e;
              }
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function Pencil({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
