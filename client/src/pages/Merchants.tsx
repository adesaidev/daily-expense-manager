import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, ExternalLink, Building2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { getMerchants, createMerchant, updateMerchant, deleteMerchant, getMerchantBreakdown } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import type { Merchant } from '../types';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  logo: z.string().optional(),
  categoryId: z.coerce.number().int().positive().optional().nullable(),
});
type FormData = z.infer<typeof schema>;

export function Merchants() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Merchant | null>(null);

  const { data: merchants } = useQuery({ queryKey: ['merchants'], queryFn: getMerchants });
  const { data: breakdown } = useQuery({
    queryKey: ['merchant-breakdown', new Date().getMonth() + 1, new Date().getFullYear()],
    queryFn: () => getMerchantBreakdown({ month: new Date().getMonth() + 1, year: new Date().getFullYear() }),
  });

  const spendMap = Object.fromEntries((breakdown ?? []).map(b => [b.merchantId, b]));

  const stripNulls = (data: Partial<FormData>) => ({
    ...data,
    categoryId: data.categoryId ?? undefined,
  });

  const createMut = useMutation({
    mutationFn: (data: Partial<FormData>) => createMerchant(stripNulls(data)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['merchants'] }); setShowForm(false); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<FormData> }) => updateMerchant(id, stripNulls(data)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['merchants'] }); setEditing(null); },
  });
  const deleteMut = useMutation({
    mutationFn: deleteMerchant,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['merchants'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Merchants</h1>
          <p className="text-sm text-gray-500 mt-1">Track where you spend your money</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus size={14} /> Add Merchant
        </Button>
      </div>

      {merchants?.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm">
          <Building2 size={40} className="mx-auto mb-3 opacity-30" />
          No merchants yet. Add one to start tracking where you spend.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {merchants?.map(merchant => {
          const spend = spendMap[merchant.id];
          return (
            <Card key={merchant.id}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center overflow-hidden">
                    {merchant.logo ? (
                      <img src={merchant.logo} alt={merchant.name} className="w-8 h-8 object-contain" />
                    ) : (
                      <Building2 size={18} className="text-indigo-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{merchant.name}</p>
                    {merchant.website && (
                      <a
                        href={merchant.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-500 hover:underline flex items-center gap-1"
                      >
                        {new URL(merchant.website).hostname}
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditing(merchant)} className="text-gray-400 hover:text-indigo-600 p-1 transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => { if (confirm('Delete this merchant? Existing expenses will be unlinked.')) deleteMut.mutate(merchant.id); }}
                    className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-50 pt-3 flex justify-between text-xs text-gray-500">
                <span>{merchant._count?.expenses ?? 0} expenses total</span>
                {spend ? (
                  <span className="font-semibold text-gray-700">{formatCurrency(spend.total)} this month</span>
                ) : (
                  <span>No spend this month</span>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Add Merchant">
        <MerchantForm onSubmit={async (data) => { await createMut.mutateAsync(data); }} onCancel={() => setShowForm(false)} />
      </Modal>
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Merchant">
        {editing && (
          <MerchantForm
            merchant={editing}
            onSubmit={async (data) => { await updateMut.mutateAsync({ id: editing.id, data }); }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function MerchantForm({ merchant, onSubmit, onCancel }: {
  merchant?: Merchant;
  onSubmit: (d: FormData) => Promise<void>;
  onCancel: () => void;
}) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: merchant ?? { name: '', website: '', logo: '' },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input
          {...register('name')}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g. Amazon, Swiggy"
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Website <span className="text-gray-400 font-normal">(optional)</span></label>
        <input
          {...register('website')}
          type="url"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="https://example.com"
        />
        {errors.website && <p className="text-red-500 text-xs mt-1">{errors.website.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL <span className="text-gray-400 font-normal">(optional)</span></label>
        <input
          {...register('logo')}
          type="url"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="https://example.com/logo.png"
        />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Saving...' : merchant ? 'Update' : 'Add'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
