import { format } from 'date-fns';

export function formatCurrency(amount: number | string): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(amount));
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'dd MMM yyyy');
}

export function getMonthName(month: number): string {
  return format(new Date(2024, month - 1, 1), 'MMM');
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
