import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Package, AlertTriangle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { getSKUs, createSKU, updateSKU, deleteSKU, getCategories, type SKUInput } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import type { SKU } from '../types';

const GST_RATES = [0, 3, 5, 12, 18, 28];
const UNITS = ['pcs', 'kg', 'g', 'litre', 'ml', 'box', 'pack', 'dozen', 'meter', 'sqft', 'set'];

const emptyToNull = (v: unknown) => v === '' || v === undefined ? null : v;
const emptyToUndef = (v: unknown) => v === '' ? undefined : v;

const schema = z.object({
  skuCode: z.preprocess(emptyToNull, z.string().nullable().optional()),
  name: z.string().min(1, 'Product name is required'),
  description: z.preprocess(emptyToNull, z.string().nullable().optional()),
  categoryId: z.preprocess(v => (v === '' || v === '0' || v === 0 || v === null) ? null : Number(v), z.number().int().positive().nullable().optional()),
  unit: z.string().min(1, 'Unit is required'),
  minStock: z.preprocess(v => v === '' ? 0 : Number(v), z.number().min(0)).default(0),
  costPrice: z.preprocess(emptyToUndef, z.coerce.number().positive('Must be > 0').optional().nullable()),
  mrp: z.preprocess(emptyToUndef, z.coerce.number().positive('Must be > 0').optional().nullable()),
  sellPrice: z.preprocess(emptyToUndef, z.coerce.number().positive('Must be > 0').optional().nullable()),
  hsnCode: z.preprocess(emptyToNull, z.string().nullable().optional()),
  gstRate: z.preprocess(v => v === '' || v === null ? null : Number(v), z.number().min(0).max(100).nullable().optional()),
});
type FormData = z.infer<typeof schema>;

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white';

// SKUForm is defined at module level to prevent remount on parent re-render
function SKUForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  defaultValues?: Partial<FormData>;
  onSubmit: (d: FormData) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}) {
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? { unit: 'pcs', minStock: 0 },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Row 1: SKU Code + Product Name */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            SKU Code <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input {...register('skuCode')} className={inputCls} placeholder="e.g. PROD-001" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
          <input {...register('name')} className={inputCls} placeholder="Product name" />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input {...register('description')} className={inputCls} placeholder="Short description" />
      </div>

      {/* Row 2: Category + Unit of Measure */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <select {...register('categoryId')} className={inputCls}>
            <option value="">No category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unit of Measure</label>
          <select {...register('unit')} className={inputCls}>
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          {errors.unit && <p className="text-red-500 text-xs mt-1">{errors.unit.message}</p>}
        </div>
      </div>

      {/* Row 3: Cost Price + MRP + Selling Price */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (₹)</label>
          <input type="number" step="0.01" {...register('costPrice')} className={inputCls} placeholder="0.00" />
          {errors.costPrice && <p className="text-red-500 text-xs mt-1">{errors.costPrice.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">MRP (₹)</label>
          <input type="number" step="0.01" {...register('mrp')} className={inputCls} placeholder="0.00" />
          {errors.mrp && <p className="text-red-500 text-xs mt-1">{errors.mrp.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (₹)</label>
          <input type="number" step="0.01" {...register('sellPrice')} className={inputCls} placeholder="0.00" />
          {errors.sellPrice && <p className="text-red-500 text-xs mt-1">{errors.sellPrice.message}</p>}
        </div>
      </div>

      {/* Row 4: HSN Code + GST Rate + Min Stock */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            HSN Code <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input {...register('hsnCode')} className={inputCls} placeholder="e.g. 8471" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">GST Rate (%)</label>
          <select {...register('gstRate')} className={inputCls}>
            <option value="">Select GST</option>
            {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock Alert</label>
          <input type="number" step="0.01" {...register('minStock')} className={inputCls} placeholder="0" />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Saving...' : submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

export function SKUs() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SKU | null>(null);

  const { data: skus = [], isLoading } = useQuery({ queryKey: ['skus'], queryFn: getSKUs });

  const createMut = useMutation({
    mutationFn: (data: SKUInput) => createSKU(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['skus'] }); setShowForm(false); },
    onError: (e: any) => alert(e?.response?.data?.message ?? 'Failed to add SKU'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: SKUInput }) => updateSKU(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['skus'] }); setEditing(null); },
    onError: (e: any) => alert(e?.response?.data?.message ?? 'Failed to update SKU'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteSKU,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['skus'] }),
  });

  const lowStock = skus.filter(s => Number(s.minStock) > 0 && Number(s.currentStock) <= Number(s.minStock));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SKU Management</h1>
          <p className="text-sm text-gray-500 mt-1">{skus.length} products</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus size={14} /> Add SKU
        </Button>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Low stock alert</p>
            <p className="text-xs text-amber-600 mt-0.5">
              {lowStock.map(s => s.name).join(', ')} {lowStock.length === 1 ? 'is' : 'are'} at or below minimum stock level
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
      ) : skus.length === 0 ? (
        <Card className="p-12 text-center">
          <Package size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No SKUs yet. Add your first product.</p>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">SKU Code</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">MRP</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Sell Price</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">GST</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">HSN</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {skus.map(sku => {
                  const isLow = Number(sku.minStock) > 0 && Number(sku.currentStock) <= Number(sku.minStock);
                  return (
                    <tr key={sku.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        {sku.skuCode
                          ? <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{sku.skuCode}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{sku.name}</p>
                        {sku.description && <p className="text-xs text-gray-400 mt-0.5 max-w-[160px] truncate">{sku.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {sku.category
                          ? <Badge label={sku.category.name} color={sku.category.color} />
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{sku.unit}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                          {Number(sku.currentStock).toFixed(2)}
                          {isLow && <AlertTriangle size={11} className="inline ml-1 text-red-500" />}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{sku.costPrice ? formatCurrency(Number(sku.costPrice)) : <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{sku.mrp ? formatCurrency(Number(sku.mrp)) : <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{sku.sellPrice ? formatCurrency(Number(sku.sellPrice)) : <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-center text-gray-500">{sku.gstRate != null ? `${Number(sku.gstRate)}%` : <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{sku.hsnCode ?? <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setEditing(sku)} className="text-gray-400 hover:text-indigo-600 transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => { if (confirm(`Delete "${sku.name}"?`)) deleteMut.mutate(sku.id); }}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Add SKU" size="lg">
        <SKUForm
          onSubmit={async (data) => { await createMut.mutateAsync(data as SKUInput); }}
          onCancel={() => setShowForm(false)}
          submitLabel="Add SKU"
        />
      </Modal>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit SKU" size="lg">
        {editing && (
          <SKUForm
            key={editing.id}
            defaultValues={{
              skuCode: editing.skuCode ?? '',
              name: editing.name,
              description: editing.description ?? '',
              categoryId: editing.categoryId ?? null,
              unit: editing.unit,
              minStock: Number(editing.minStock),
              costPrice: editing.costPrice ? Number(editing.costPrice) : null,
              mrp: editing.mrp ? Number(editing.mrp) : null,
              sellPrice: editing.sellPrice ? Number(editing.sellPrice) : null,
              hsnCode: editing.hsnCode ?? '',
              gstRate: editing.gstRate != null ? Number(editing.gstRate) : null,
            }}
            onSubmit={async (data) => { await updateMut.mutateAsync({ id: editing.id, data: data as SKUInput }); }}
            onCancel={() => setEditing(null)}
            submitLabel="Save Changes"
          />
        )}
      </Modal>
    </div>
  );
}
