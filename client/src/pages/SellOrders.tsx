import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ChevronDown, ChevronUp, TrendingUp, Pencil } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { getSellOrders, createSellOrder, updateSellOrder, deleteSellOrder, getSKUs } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import type { SellOrder, SellOrderStatus } from '../types';

const itemSchema = z.object({
  skuId: z.coerce.number().int().positive('Select a SKU'),
  quantity: z.coerce.number().positive('Must be > 0'),
  unitPrice: z.coerce.number().min(0, 'Must be ≥ 0'),
});

const schema = z.object({
  customerName: z.string().optional().nullable(),
  date: z.string().min(1),
  notes: z.string().optional().nullable(),
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']),
  items: z.array(itemSchema).min(1, 'Add at least one item'),
});
type FormData = z.infer<typeof schema>;

const STATUS_META: Record<SellOrderStatus, { label: string; cls: string }> = {
  PENDING:   { label: 'Pending',   cls: 'bg-amber-100 text-amber-700' },
  COMPLETED: { label: 'Completed', cls: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-red-100 text-red-600' },
};

function StatusBadge({ status }: { status: SellOrderStatus }) {
  const m = STATUS_META[status];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${m.cls}`}>{m.label}</span>;
}

function SellOrderForm({ order, onSubmit, onCancel }: {
  order?: SellOrder;
  onSubmit: (d: FormData) => Promise<void>;
  onCancel: () => void;
}) {
  const { data: skus = [] } = useQuery({ queryKey: ['skus'], queryFn: getSKUs });

  const { register, control, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: order ? {
      customerName: order.customerName ?? '',
      date: format(new Date(order.date), "yyyy-MM-dd'T'HH:mm"),
      notes: order.notes ?? '',
      status: order.status,
      items: order.items.map(i => ({ skuId: i.skuId, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })),
    } : {
      date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      status: 'COMPLETED',
      items: [{ skuId: 0, quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = watch('items');
  const status = watch('status');

  const total = watchedItems.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);
  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer <span className="text-gray-400 font-normal">(optional)</span></label>
          <input {...register('customerName')} className={inputCls} placeholder="Customer name" />
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
          {(['PENDING', 'COMPLETED', 'CANCELLED'] as SellOrderStatus[]).map(s => (
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
          {isSubmitting ? 'Saving...' : order ? 'Update Order' : 'Create Order'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

export function SellOrders() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SellOrder | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['sell-orders', { page, status: statusFilter }],
    queryFn: () => getSellOrders({ page, limit: 20, ...(statusFilter ? { status: statusFilter } : {}) }),
  });

  const createMut = useMutation({
    mutationFn: createSellOrder,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sell-orders'] }); qc.invalidateQueries({ queryKey: ['skus'] }); setShowForm(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateSellOrder>[1] }) => updateSellOrder(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sell-orders'] }); qc.invalidateQueries({ queryKey: ['skus'] }); setEditing(null); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteSellOrder,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sell-orders'] }); qc.invalidateQueries({ queryKey: ['skus'] }); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sell Orders</h1>
          <p className="text-sm text-gray-500 mt-1">{data?.total ?? 0} orders</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus size={14} /> New Order
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
            {s === '' ? 'All' : STATUS_META[s as SellOrderStatus].label}
          </button>
        ))}
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{error}</div>}

      {isLoading ? (
        <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
      ) : data?.data.length === 0 ? (
        <Card className="p-12 text-center">
          <TrendingUp size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No sell orders yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {data?.data.map(order => (
            <Card key={order.id} className="p-0 overflow-hidden">
              <div className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-gray-900">{formatCurrency(Number(order.totalAmount))}</span>
                    <StatusBadge status={order.status} />
                    {order.customerName && <span className="text-sm text-gray-500">to {order.customerName}</span>}
                    <span className="text-xs text-gray-400">{formatDate(order.date)}</span>
                  </div>
                  {order.notes && <p className="text-xs text-gray-400 mt-0.5">{order.notes}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-400">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                  <button onClick={() => setEditing(order)} className="text-gray-400 hover:text-indigo-600 transition-colors p-1">
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => { if (confirm('Delete this order? Stock will be reversed.')) deleteMut.mutate(order.id); }}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  ><Trash2 size={14} /></button>
                  <button
                    onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                  >
                    {expanded === order.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>
              {expanded === order.id && (
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
                      {order.items.map(item => (
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

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="New Sell Order" size="lg">
        <SellOrderForm
          onSubmit={async (data) => {
            setError('');
            try {
              await createMut.mutateAsync({ ...data, date: new Date(data.date).toISOString() });
            } catch (e: any) {
              setError(e?.response?.data?.message ?? e?.message ?? 'Failed to create order');
              throw e;
            }
          }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Sell Order" size="lg">
        {editing && (
          <SellOrderForm
            order={editing}
            onSubmit={async (data) => {
              setError('');
              try {
                await updateMut.mutateAsync({ id: editing.id, data: { ...data, date: new Date(data.date).toISOString() } });
              } catch (e: any) {
                setError(e?.response?.data?.message ?? e?.message ?? 'Failed to update order');
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
