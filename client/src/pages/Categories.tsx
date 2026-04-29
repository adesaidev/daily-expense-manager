import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../lib/api';
import type { Category } from '../types';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  color: z.string().min(1),
  icon: z.string().min(1),
});
type FormData = z.infer<typeof schema>;

export function Categories() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: getCategories });

  const createMut = useMutation({
    mutationFn: createCategory,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setShowForm(false); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: FormData }) => updateCategory(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setEditing(null); },
  });
  const deleteMut = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-1">Organize your expenses</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus size={14} /> Add Category
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories?.map(cat => (
          <Card key={cat.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: cat.color + '20' }}>
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">{cat.name}</p>
                <p className="text-xs text-gray-400">{cat._count?.expenses ?? 0} expenses</p>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setEditing(cat)} className="text-gray-400 hover:text-indigo-600 p-1 transition-colors">
                <Pencil size={14} />
              </button>
              <button
                onClick={() => { if (confirm('Delete this category?')) deleteMut.mutate(cat.id); }}
                className="text-gray-400 hover:text-red-500 p-1 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Add Category">
        <CategoryForm onSubmit={async (data) => { await createMut.mutateAsync(data); }} onCancel={() => setShowForm(false)} />
      </Modal>
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Category">
        {editing && (
          <CategoryForm
            category={editing}
            onSubmit={async (data) => { await updateMut.mutateAsync({ id: editing.id, data }); }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function CategoryForm({ category, onSubmit, onCancel }: { category?: Category; onSubmit: (d: FormData) => Promise<void>; onCancel: () => void }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: category ?? { color: '#6366f1', icon: 'tag' },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input {...register('name')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
        <div className="flex items-center gap-3">
          <input type="color" {...register('color')} className="w-10 h-10 rounded-lg cursor-pointer border border-gray-300" />
          <input {...register('color')} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Icon name</label>
        <input {...register('icon')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. utensils" />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Saving...' : category ? 'Update' : 'Add'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
