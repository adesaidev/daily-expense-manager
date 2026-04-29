import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, X, Edit2, Trash2, Package, Upload, ImageOff,
  ChevronDown, ChevronUp, Tag, Weight, Ruler, Layers, Info,
} from 'lucide-react';
import {
  getProducts, createProduct, updateProduct, deleteProduct,
  uploadProductImage, deleteProductImage,
} from '../lib/api';
import type { Product, ProductInput } from '../types';
import { cn } from '../lib/utils';

const GST_RATES = [0, 5, 12, 18, 28];

const EMPTY_FORM: ProductInput = {
  name: '',
  genericName: '',
  weightGrams: null,
  size: '',
  variation: '',
  color: '#6366f1',
  costPrice: 0,
  mrp: 0,
  recommendedAge: '',
  includeComponents: '',
  material: '',
  packageDimension: '',
  productDimension: '',
  hsnCode: '',
  gstRate: null,
};

function formatINR(val: string | number) {
  const n = Number(val);
  if (isNaN(n)) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
}

// ─── Product Form Modal ───────────────────────────────────────────────────────
function ProductModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: Product;
  onClose: () => void;
  onSave: (data: ProductInput) => void;
}) {
  const [form, setForm] = useState<ProductInput>(
    initial
      ? {
          name: initial.name,
          genericName: initial.genericName ?? '',
          weightGrams: initial.weightGrams ?? null,
          size: initial.size ?? '',
          variation: initial.variation ?? '',
          color: initial.color ?? '#6366f1',
          costPrice: Number(initial.costPrice),
          mrp: Number(initial.mrp),
          recommendedAge: initial.recommendedAge ?? '',
          includeComponents: initial.includeComponents ?? '',
          material: initial.material ?? '',
          packageDimension: initial.packageDimension ?? '',
          productDimension: initial.productDimension ?? '',
          hsnCode: initial.hsnCode ?? '',
          gstRate: initial.gstRate ?? null,
        }
      : EMPTY_FORM
  );

  const set = (k: keyof ProductInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const raw = e.target.value;
    if (k === 'weightGrams' || k === 'costPrice' || k === 'mrp') {
      setForm(f => ({ ...f, [k]: raw === '' ? (k === 'weightGrams' ? null : 0) : Number(raw) }));
    } else if (k === 'gstRate') {
      setForm(f => ({ ...f, gstRate: raw === '' ? null : Number(raw) }));
    } else {
      setForm(f => ({ ...f, [k]: raw === '' ? null : raw }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {initial ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form id="productForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Basic Information */}
          <Section title="Basic Information" icon={<Info size={15} />}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Product Name *" className="col-span-2">
                <input
                  required
                  value={form.name}
                  onChange={set('name')}
                  placeholder="e.g. Wooden Toy Car"
                  className={inputCls}
                />
              </Field>
              <Field label="Generic Name">
                <input value={form.genericName ?? ''} onChange={set('genericName')} placeholder="e.g. Toy Vehicle" className={inputCls} />
              </Field>
              <Field label="Variation">
                <input value={form.variation ?? ''} onChange={set('variation')} placeholder="e.g. Small / Blue / Pack of 3" className={inputCls} />
              </Field>
            </div>
          </Section>

          {/* Physical Properties */}
          <Section title="Physical Properties" icon={<Weight size={15} />}>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Weight (grams)">
                <input
                  type="number" min={0} step="0.01"
                  value={form.weightGrams ?? ''}
                  onChange={set('weightGrams')}
                  placeholder="e.g. 250"
                  className={inputCls}
                />
              </Field>
              <Field label="Size">
                <input value={form.size ?? ''} onChange={set('size')} placeholder="e.g. Medium / 30cm" className={inputCls} />
              </Field>
              <Field label="Recommended Age">
                <input value={form.recommendedAge ?? ''} onChange={set('recommendedAge')} placeholder="e.g. 3+ years" className={inputCls} />
              </Field>
              <Field label="Material">
                <input value={form.material ?? ''} onChange={set('material')} placeholder="e.g. ABS Plastic" className={inputCls} />
              </Field>
              <Field label="Color">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.color ?? '#6366f1'}
                    onChange={set('color')}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200 p-0.5 bg-white"
                  />
                  <span className="text-sm font-mono text-gray-600">{form.color ?? '#6366f1'}</span>
                </div>
              </Field>
            </div>
          </Section>

          {/* Dimensions */}
          <Section title="Dimensions" icon={<Ruler size={15} />}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Product Dimension (cm)" hint="L × W × H">
                <input value={form.productDimension ?? ''} onChange={set('productDimension')} placeholder="e.g. 30×20×10" className={inputCls} />
              </Field>
              <Field label="Package Dimension (cm)" hint="L × W × H">
                <input value={form.packageDimension ?? ''} onChange={set('packageDimension')} placeholder="e.g. 35×22×12" className={inputCls} />
              </Field>
            </div>
          </Section>

          {/* Pricing & Tax */}
          <Section title="Pricing & Tax" icon={<Tag size={15} />}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Cost Price (₹) *">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                  <input
                    required type="number" min={0} step="0.01"
                    value={form.costPrice || ''}
                    onChange={set('costPrice')}
                    placeholder="0.00"
                    className={cn(inputCls, 'pl-7')}
                  />
                </div>
              </Field>
              <Field label="MRP (₹) *">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                  <input
                    required type="number" min={0} step="0.01"
                    value={form.mrp || ''}
                    onChange={set('mrp')}
                    placeholder="0.00"
                    className={cn(inputCls, 'pl-7')}
                  />
                </div>
              </Field>
              <Field label="HSN Code">
                <input value={form.hsnCode ?? ''} onChange={set('hsnCode')} placeholder="e.g. 9503" className={inputCls} />
              </Field>
              <Field label="GST Rate">
                <select value={form.gstRate ?? ''} onChange={set('gstRate')} className={inputCls}>
                  <option value="">— Select GST Rate —</option>
                  {GST_RATES.map(r => (
                    <option key={r} value={r}>{r}%</option>
                  ))}
                </select>
              </Field>
            </div>
            {form.costPrice > 0 && form.mrp > 0 && (
              <div className="mt-3 p-3 bg-indigo-50 rounded-lg flex gap-6 text-sm">
                <span className="text-gray-600">
                  Margin:{' '}
                  <strong className="text-indigo-700">
                    {formatINR(form.mrp - form.costPrice)}
                  </strong>
                </span>
                <span className="text-gray-600">
                  Margin %:{' '}
                  <strong className={form.mrp >= form.costPrice ? 'text-green-600' : 'text-red-600'}>
                    {(((form.mrp - form.costPrice) / form.mrp) * 100).toFixed(1)}%
                  </strong>
                </span>
                {form.gstRate != null && (
                  <span className="text-gray-600">
                    GST Amount:{' '}
                    <strong className="text-orange-600">
                      {formatINR((form.mrp * form.gstRate) / (100 + form.gstRate))}
                    </strong>
                  </span>
                )}
              </div>
            )}
          </Section>

          {/* Included Components */}
          <Section title="Package Contents" icon={<Layers size={15} />}>
            <Field label="Included Components" hint="comma-separated">
              <textarea
                value={form.includeComponents ?? ''}
                onChange={set('includeComponents')}
                rows={2}
                placeholder="e.g. 1× Car body, 4× Wheels, 1× Instruction manual"
                className={cn(inputCls, 'resize-none')}
              />
            </Field>
          </Section>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            form="productForm"
            className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            {initial ? 'Save Changes' : 'Create Product'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Product Detail Modal ─────────────────────────────────────────────────────
function ProductDetail({
  product,
  onClose,
  onEdit,
  onDelete,
  onImageUpload,
  onImageDelete,
}: {
  product: Product;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onImageUpload: (file: File) => void;
  onImageDelete: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const Row = ({ label, value }: { label: string; value?: string | number | null }) =>
    value != null && value !== '' ? (
      <div className="flex gap-3 py-2.5 border-b border-gray-50 last:border-0">
        <span className="w-44 text-xs font-medium text-gray-400 uppercase tracking-wide shrink-0 pt-0.5">{label}</span>
        <span className="text-sm text-gray-800">{value}</span>
      </div>
    ) : null;

  const margin = Number(product.mrp) - Number(product.costPrice);
  const marginPct = Number(product.mrp) > 0 ? ((margin / Number(product.mrp)) * 100).toFixed(1) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-start gap-4">
            {/* Image */}
            <div className="relative group shrink-0">
              <div className="w-20 h-20 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center">
                {product.imagePath ? (
                  <img src={product.imagePath} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <Package size={28} className="text-gray-300" />
                )}
              </div>
              <div className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="p-1 bg-white/90 rounded-md hover:bg-white"
                  title="Upload image"
                >
                  <Upload size={13} className="text-gray-700" />
                </button>
                {product.imagePath && (
                  <button onClick={onImageDelete} className="p-1 bg-white/90 rounded-md hover:bg-white" title="Remove image">
                    <ImageOff size={13} className="text-gray-700" />
                  </button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { if (e.target.files?.[0]) onImageUpload(e.target.files[0]); }}
              />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{product.name}</h2>
              {product.genericName && <p className="text-sm text-gray-500">{product.genericName}</p>}
              <div className="flex items-center gap-2 mt-2">
                {product.color && (
                  <span
                    className="w-5 h-5 rounded-full border border-white shadow-sm ring-1 ring-gray-200"
                    style={{ backgroundColor: product.color }}
                    title={product.color}
                  />
                )}
                {product.variation && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{product.variation}</span>
                )}
                {product.gstRate != null && (
                  <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-medium">GST {product.gstRate}%</span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Pricing banner */}
        <div className="grid grid-cols-3 gap-px bg-gray-100 border-b border-gray-100">
          <div className="bg-white px-5 py-3">
            <p className="text-xs text-gray-400 mb-0.5">Cost Price</p>
            <p className="text-lg font-bold text-gray-900">{formatINR(product.costPrice)}</p>
          </div>
          <div className="bg-white px-5 py-3">
            <p className="text-xs text-gray-400 mb-0.5">MRP</p>
            <p className="text-lg font-bold text-indigo-700">{formatINR(product.mrp)}</p>
          </div>
          <div className="bg-white px-5 py-3">
            <p className="text-xs text-gray-400 mb-0.5">Margin</p>
            <p className={cn('text-lg font-bold', margin >= 0 ? 'text-green-600' : 'text-red-600')}>
              {formatINR(margin)}
              {marginPct && <span className="text-sm font-normal ml-1">({marginPct}%)</span>}
            </p>
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Row label="Size" value={product.size} />
          <Row label="Weight" value={product.weightGrams != null ? `${product.weightGrams} g` : null} />
          <Row label="Material" value={product.material} />
          <Row label="Recommended Age" value={product.recommendedAge} />
          <Row label="Product Dimensions" value={product.productDimension} />
          <Row label="Package Dimensions" value={product.packageDimension} />
          <Row label="HSN Code" value={product.hsnCode} />
          <Row label="GST Rate" value={product.gstRate != null ? `${product.gstRate}%` : null} />
          {product.gstRate != null && (
            <Row
              label="GST on MRP"
              value={formatINR((Number(product.mrp) * product.gstRate) / (100 + product.gstRate))}
            />
          )}
          {product.includeComponents && (
            <div className="py-2.5 border-b border-gray-50">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Included Components</p>
              <div className="flex flex-wrap gap-1.5">
                {product.includeComponents.split(',').map(c => c.trim()).filter(Boolean).map((c, i) => (
                  <span key={i} className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full">{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onDelete}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={15} />
            Delete
          </button>
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            <Edit2 size={15} />
            Edit Product
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ product, onClick }: { product: Product; onClick: () => void }) {
  const margin = Number(product.mrp) - Number(product.costPrice);
  const marginPct = Number(product.mrp) > 0 ? ((margin / Number(product.mrp)) * 100).toFixed(0) : null;

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all text-left group overflow-hidden"
    >
      {/* Image */}
      <div className="h-40 bg-gray-50 flex items-center justify-center overflow-hidden relative">
        {product.imagePath ? (
          <img src={product.imagePath} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <Package size={36} className="text-gray-200" />
        )}
        {product.gstRate != null && (
          <span className="absolute top-2 right-2 text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded-md font-medium">
            GST {product.gstRate}%
          </span>
        )}
        {product.color && (
          <span
            className="absolute top-2 left-2 w-5 h-5 rounded-full border-2 border-white shadow"
            style={{ backgroundColor: product.color }}
          />
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="font-semibold text-gray-900 text-sm truncate">{product.name}</p>
        {product.genericName && <p className="text-xs text-gray-400 truncate mt-0.5">{product.genericName}</p>}
        {product.variation && (
          <p className="text-xs text-indigo-600 mt-1 truncate">{product.variation}</p>
        )}

        <div className="flex items-end justify-between mt-3 pt-3 border-t border-gray-50">
          <div>
            <p className="text-xs text-gray-400">MRP</p>
            <p className="text-base font-bold text-gray-900">{formatINR(product.mrp)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Cost</p>
            <p className="text-sm font-medium text-gray-600">{formatINR(product.costPrice)}</p>
          </div>
        </div>

        {marginPct && (
          <div className={cn(
            'mt-2 text-xs font-medium px-2 py-1 rounded-md text-center',
            margin >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
          )}>
            {margin >= 0 ? '+' : ''}{marginPct}% margin
          </div>
        )}

        {product.hsnCode && (
          <p className="text-xs text-gray-400 mt-2 font-mono">HSN: {product.hsnCode}</p>
        )}
      </div>
    </button>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white placeholder-gray-400 transition-shadow';

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <span className="text-indigo-500">{icon}</span>
          {title}
        </div>
        {open ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}
        {hint && <span className="ml-1 text-gray-400 font-normal">({hint})</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function Products() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [viewing, setViewing] = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', debouncedSearch],
    queryFn: () => getProducts(debouncedSearch || undefined),
  });

  const createMut = useMutation({
    mutationFn: createProduct,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); setShowForm(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProductInput> }) => updateProduct(id, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setEditing(null);
      setViewing(updated);
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); setDeleteConfirm(null); setViewing(null); },
  });

  const imgUploadMut = useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => uploadProductImage(id, file),
    onSuccess: (updated) => { qc.invalidateQueries({ queryKey: ['products'] }); setViewing(updated); },
  });

  const imgDeleteMut = useMutation({
    mutationFn: (id: number) => deleteProductImage(id),
    onSuccess: (updated) => { qc.invalidateQueries({ queryKey: ['products'] }); setViewing(updated); },
  });

  const handleSave = (data: ProductInput) => {
    if (editing) {
      updateMut.mutate({ id: editing.id, data });
    } else {
      createMut.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Catalog</h1>
          <p className="text-sm text-gray-500 mt-0.5">{products.length} product{products.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus size={16} />
          Add Product
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, material, HSN, color, variation, size…"
          className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={15} />
          </button>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="h-40 bg-gray-100" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
                <div className="h-6 bg-gray-100 rounded mt-3" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
            <Package size={28} className="text-indigo-300" />
          </div>
          <p className="text-gray-900 font-semibold">
            {debouncedSearch ? 'No products match your search' : 'No products yet'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {debouncedSearch ? 'Try a different keyword' : 'Click "Add Product" to create your first product'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(p => (
            <ProductCard key={p.id} product={p} onClick={() => setViewing(p)} />
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      {(showForm || editing) && (
        <ProductModal
          initial={editing ?? undefined}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}

      {/* Detail modal */}
      {viewing && !editing && (
        <ProductDetail
          product={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => setEditing(viewing)}
          onDelete={() => setDeleteConfirm(viewing)}
          onImageUpload={file => imgUploadMut.mutate({ id: viewing.id, file })}
          onImageDelete={() => imgDeleteMut.mutate(viewing.id)}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Delete Product</h3>
            <p className="text-sm text-gray-500 mb-6">
              Delete <strong>{deleteConfirm.name}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMut.mutate(deleteConfirm.id)}
                disabled={deleteMut.isPending}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-60"
              >
                {deleteMut.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
