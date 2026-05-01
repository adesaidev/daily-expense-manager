import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Upload, X, FileImage, Plus, Check } from 'lucide-react';
import { Button } from './ui/Button';
import { getCategories, getMerchants, uploadBillImage, deleteBillImage, createCategory, createMerchant } from '../lib/api';
import type { Expense } from '../types';
import { format } from 'date-fns';

const PAYMENT_TYPES = [
  { value: 'CASH',          label: 'Cash',          icon: '💵' },
  { value: 'UPI',           label: 'UPI',           icon: '📱' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: '🏦' },
  { value: 'CARD',          label: 'Card',          icon: '💳' },
] as const;

const schema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
  date: z.string().min(1, 'Date is required'),
  categoryId: z.coerce.number().int().positive('Select a category'),
  merchantId: z.coerce.number().int().positive().optional().nullable(),
  paymentStatus: z.enum(['PENDING', 'COMPLETED']),
  paymentType: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CARD']).nullable().optional(),
  isRecurring: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  expense?: Expense;
  onSubmit: (data: FormData) => Promise<Expense>;
  onCancel: () => void;
}

export function ExpenseForm({ expense, onSubmit, onCancel }: Props) {
  const qc = useQueryClient();
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: getCategories });
  const { data: merchants } = useQuery({ queryKey: ['merchants'], queryFn: getMerchants });

  // Inline add state
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddMerchant, setShowAddMerchant] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#6366f1');
  const [newMerchantName, setNewMerchantName] = useState('');
  const [newMerchantWebsite, setNewMerchantWebsite] = useState('');

  // Bill image state
  const [billFile, setBillFile] = useState<File | null>(null);
  const [billPreview, setBillPreview] = useState<string | null>(expense?.billImagePath ?? null);
  const [uploadingBill, setUploadingBill] = useState(false);
  const [removingBill, setRemovingBill] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: expense
      ? {
          amount: Number(expense.amount),
          description: expense.description,
          date: format(new Date(expense.date), "yyyy-MM-dd'T'HH:mm"),
          categoryId: expense.categoryId,
          merchantId: expense.merchantId ?? null,
          paymentStatus: expense.paymentStatus,
          paymentType: expense.paymentType ?? null,
          isRecurring: expense.isRecurring,
        }
      : {
          date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
          merchantId: null,
          paymentStatus: 'COMPLETED',
          paymentType: 'CASH' as const,
          isRecurring: false,
        },
  });

  const paymentStatus = watch('paymentStatus');
  const paymentType = watch('paymentType');

  // Inline create mutations
  const addCategoryMut = useMutation({
    mutationFn: () => createCategory({ name: newCatName.trim(), color: newCatColor, icon: 'tag' }),
    onSuccess: (cat) => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      setValue('categoryId', cat.id);
      setNewCatName('');
      setNewCatColor('#6366f1');
      setShowAddCategory(false);
    },
  });

  const addMerchantMut = useMutation({
    mutationFn: () => createMerchant({
      name: newMerchantName.trim(),
      ...(newMerchantWebsite.trim() ? { website: newMerchantWebsite.trim() } : {}),
    }),
    onSuccess: (merchant) => {
      qc.invalidateQueries({ queryKey: ['merchants'] });
      setValue('merchantId', merchant.id);
      setNewMerchantName('');
      setNewMerchantWebsite('');
      setShowAddMerchant(false);
    },
  });

  // Bill image handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBillFile(file);
    setBillPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
  };

  const handleRemoveBill = async () => {
    if (expense?.billImagePath) {
      setRemovingBill(true);
      try {
        await deleteBillImage(expense.id);
        qc.invalidateQueries({ queryKey: ['expenses'] });
      } finally {
        setRemovingBill(false);
      }
    }
    setBillFile(null);
    setBillPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleFormSubmit = async (data: FormData) => {
    setSubmitError(null);
    try {
      const saved = await onSubmit({
        ...data,
        date: new Date(data.date).toISOString(),
        merchantId: data.merchantId || null,
        paymentType: data.paymentType ?? null,
      });
      if (billFile && saved?.id) {
        setUploadingBill(true);
        try {
          await uploadBillImage(saved.id, billFile);
          qc.invalidateQueries({ queryKey: ['expenses'] });
        } finally {
          setUploadingBill(false);
        }
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? (err instanceof Error ? err.message : 'Failed to save expense');
      setSubmitError(msg);
    }
  };

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
        <input type="number" step="0.01" {...register('amount')} className={inputCls} placeholder="0.00" />
        {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <input type="text" {...register('description')} className={inputCls} placeholder="What did you spend on?" />
        {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
      </div>

      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
        <input type="datetime-local" {...register('date')} className={inputCls} />
        {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
      </div>

      {/* Category + inline add */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-gray-700">Category</label>
          <button
            type="button"
            onClick={() => { setShowAddCategory(v => !v); setShowAddMerchant(false); }}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            <Plus size={12} />
            {showAddCategory ? 'Cancel' : 'Add new'}
          </button>
        </div>

        <select {...register('categoryId')} className={inputCls}>
          <option value="">Select category</option>
          {categories?.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
        </select>
        {errors.categoryId && <p className="text-red-500 text-xs mt-1">{errors.categoryId.message}</p>}

        {/* Inline add category panel */}
        {showAddCategory && (
          <div className="mt-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg space-y-2">
            <p className="text-xs font-semibold text-indigo-700">New Category</p>
            <input
              type="text"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              placeholder="Category name"
              className="w-full border border-indigo-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600">Color</label>
              <input
                type="color"
                value={newCatColor}
                onChange={e => setNewCatColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-indigo-300"
              />
              <span className="text-xs text-gray-500 font-mono">{newCatColor}</span>
            </div>
            <Button
              type="button"
              size="sm"
              disabled={!newCatName.trim() || addCategoryMut.isPending}
              onClick={() => addCategoryMut.mutate()}
              className="w-full"
            >
              <Check size={13} />
              {addCategoryMut.isPending ? 'Adding...' : 'Add Category'}
            </Button>
            {addCategoryMut.isError && (
              <p className="text-red-500 text-xs">Failed to add — name may already exist.</p>
            )}
          </div>
        )}
      </div>

      {/* Merchant + inline add */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-gray-700">
            Merchant <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <button
            type="button"
            onClick={() => { setShowAddMerchant(v => !v); setShowAddCategory(false); }}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            <Plus size={12} />
            {showAddMerchant ? 'Cancel' : 'Add new'}
          </button>
        </div>

        <select {...register('merchantId')} className={inputCls}>
          <option value="">No merchant</option>
          {merchants?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>

        {/* Inline add merchant panel */}
        {showAddMerchant && (
          <div className="mt-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg space-y-2">
            <p className="text-xs font-semibold text-indigo-700">New Merchant</p>
            <input
              type="text"
              value={newMerchantName}
              onChange={e => setNewMerchantName(e.target.value)}
              placeholder="Merchant name"
              className="w-full border border-indigo-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
            <input
              type="url"
              value={newMerchantWebsite}
              onChange={e => setNewMerchantWebsite(e.target.value)}
              placeholder="Website (optional, e.g. https://amazon.in)"
              className="w-full border border-indigo-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
            <Button
              type="button"
              size="sm"
              disabled={!newMerchantName.trim() || addMerchantMut.isPending}
              onClick={() => addMerchantMut.mutate()}
              className="w-full"
            >
              <Check size={13} />
              {addMerchantMut.isPending ? 'Adding...' : 'Add Merchant'}
            </Button>
            {addMerchantMut.isError && (
              <p className="text-red-500 text-xs">Failed to add — name may already exist.</p>
            )}
          </div>
        )}
      </div>

      {/* Payment Status Toggle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
        <div className="flex rounded-lg overflow-hidden border border-gray-300">
          <button
            type="button"
            onClick={() => setValue('paymentStatus', 'COMPLETED')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              paymentStatus === 'COMPLETED' ? 'bg-green-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Completed
          </button>
          <button
            type="button"
            onClick={() => { setValue('paymentStatus', 'PENDING'); setValue('paymentType', null); }}
            className={`flex-1 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${
              paymentStatus === 'PENDING' ? 'bg-amber-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Pending
          </button>
        </div>
      </div>

      {/* Payment Type — only shown when Completed */}
      {paymentStatus === 'COMPLETED' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Payment Type</label>
          <div className="grid grid-cols-4 gap-2">
            {PAYMENT_TYPES.map(({ value, label, icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setValue('paymentType', value)}
                className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border-2 text-xs font-medium transition-all ${
                  paymentType === value
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg leading-none">{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bill Image Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Bill / Receipt <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        {billPreview || (expense?.billImagePath && !billFile) ? (
          <div className="relative inline-block">
            {billFile?.type === 'application/pdf' ? (
              <div className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
                <FileImage size={20} className="text-red-500" />
                <span className="text-sm text-gray-600">{billFile.name}</span>
              </div>
            ) : billPreview ? (
              <img src={billPreview} alt="Bill preview" className="h-28 w-auto rounded-lg border border-gray-200 object-cover" />
            ) : null}
            <button
              type="button"
              onClick={handleRemoveBill}
              disabled={removingBill}
              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
            >
              <X size={10} />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
            <Upload size={18} className="text-gray-400 mb-1" />
            <span className="text-xs text-gray-400">Click to upload image or PDF (max 5MB)</span>
            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} />
          </label>
        )}
      </div>

      {/* Recurring */}
      <div className="flex items-center gap-2">
        <input type="checkbox" id="isRecurring" {...register('isRecurring')} className="rounded" />
        <label htmlFor="isRecurring" className="text-sm text-gray-700">Mark as recurring</label>
      </div>

      {submitError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{submitError}</p>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting || uploadingBill} className="flex-1">
          {isSubmitting ? 'Saving...' : uploadingBill ? 'Uploading bill...' : expense ? 'Update' : 'Add Expense'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
