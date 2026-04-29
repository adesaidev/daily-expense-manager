import { cn } from '../../lib/utils';

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

export function Card({ className, children }: CardProps) {
  return (
    <div className={cn('bg-white rounded-xl shadow-sm border border-gray-100 p-6', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: CardProps) {
  return <h3 className={cn('text-sm font-medium text-gray-500 mb-1', className)}>{children}</h3>;
}
