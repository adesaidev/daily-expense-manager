import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Star, Activity } from 'lucide-react';
import { Card, CardTitle } from '../components/ui/Card';
import { getDashboardStats, getMonthlySummary, getCategoryBreakdown } from '../lib/api';
import { formatCurrency, getMonthName } from '../lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

export function Dashboard() {
  const { data: stats } = useQuery({ queryKey: ['dashboard-stats'], queryFn: getDashboardStats });
  const { data: monthly } = useQuery({
    queryKey: ['monthly', new Date().getFullYear()],
    queryFn: () => getMonthlySummary(new Date().getFullYear()),
  });
  const { data: breakdown } = useQuery({
    queryKey: ['breakdown', new Date().getMonth() + 1, new Date().getFullYear()],
    queryFn: () => getCategoryBreakdown({ month: new Date().getMonth() + 1, year: new Date().getFullYear() }),
  });

  const monthlyChartData = monthly?.map(m => ({ name: getMonthName(m.month), total: m.total })) ?? [];
  const pieData = breakdown?.map(b => ({ name: b.category.name, value: b.total, color: b.category.color })) ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your spending</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="This Month"
          value={formatCurrency(stats?.thisMonthTotal ?? 0)}
          icon={<DollarSign size={20} className="text-indigo-600" />}
          sub={
            stats ? (
              <span className={`flex items-center gap-1 text-xs ${stats.changePercent >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                {stats.changePercent >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {Math.abs(stats.changePercent)}% vs last month
              </span>
            ) : null
          }
        />
        <StatCard
          title="Last Month"
          value={formatCurrency(stats?.lastMonthTotal ?? 0)}
          icon={<Activity size={20} className="text-blue-600" />}
        />
        <StatCard
          title="Transactions"
          value={String(stats?.thisMonthCount ?? 0)}
          icon={<ShoppingCart size={20} className="text-green-600" />}
          sub={<span className="text-xs text-gray-400">This month</span>}
        />
        <StatCard
          title="Top Category"
          value={stats?.topCategory ?? '—'}
          icon={<Star size={20} className="text-yellow-500" />}
          sub={<span className="text-xs text-gray-400">This month</span>}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Spending ({new Date().getFullYear()})</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₹${v}`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Category Breakdown</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={80}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No data</div>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, sub }: {
  title: string; value: string; icon: React.ReactNode; sub?: React.ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <div className="mt-1">{sub}</div>}
        </div>
        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">{icon}</div>
      </div>
    </Card>
  );
}
