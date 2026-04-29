import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../components/ui/Card';
import { getMonthlySummary, getCategoryBreakdown, getMerchantBreakdown } from '../lib/api';
import { formatCurrency, getMonthName } from '../lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';

export function Analytics() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const { data: monthly } = useQuery({ queryKey: ['monthly', year], queryFn: () => getMonthlySummary(year) });
  const { data: breakdown } = useQuery({ queryKey: ['breakdown', month, year], queryFn: () => getCategoryBreakdown({ month, year }) });
  const { data: merchantBreakdown } = useQuery({ queryKey: ['merchant-breakdown', month, year], queryFn: () => getMerchantBreakdown({ month, year }) });

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(2024, i).toLocaleString('default', { month: 'long' }) }));

  const barData = monthly?.map(m => ({ name: getMonthName(m.month), total: m.total })) ?? [];
  const pieData = breakdown?.map(b => ({ name: b.category.name, value: b.total, color: b.category.color })) ?? [];
  const totalMonth = pieData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Spending trends and insights</p>
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          value={month}
          onChange={e => setMonth(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly bar */}
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Spending — {year}</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v}`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Line trend */}
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Spending Trend — {year}</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v}`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Pie */}
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Category Breakdown — {months.find(m => m.value === month)?.label} {year}</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No data for this period</div>
          )}
        </Card>

        {/* Category table */}
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Category Details</h3>
          <div className="space-y-3">
            {breakdown?.sort((a, b) => b.total - a.total).map(b => (
              <div key={b.categoryId} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: b.category.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-sm font-medium text-gray-700 truncate">{b.category.name}</span>
                    <span className="text-sm font-semibold text-gray-900 ml-2">{formatCurrency(b.total)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: `${totalMonth > 0 ? (b.total / totalMonth) * 100 : 0}%`, backgroundColor: b.category.color }}
                    />
                  </div>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0 w-8 text-right">
                  {totalMonth > 0 ? ((b.total / totalMonth) * 100).toFixed(0) : 0}%
                </span>
              </div>
            ))}
            {(!breakdown || breakdown.length === 0) && (
              <div className="text-center py-4 text-gray-400 text-sm">No data for this period</div>
            )}
          </div>
        </Card>

        {/* Merchant breakdown — full width */}
        <Card className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Merchants — {months.find(m => m.value === month)?.label} {year}</h3>
          {merchantBreakdown && merchantBreakdown.length > 0 ? (
            <div className="space-y-3">
              {merchantBreakdown.slice(0, 8).map(b => {
                const topTotal = merchantBreakdown[0]?.total ?? 1;
                return (
                  <div key={b.merchantId} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {b.merchant?.logo
                        ? <img src={b.merchant.logo} alt={b.merchant.name} className="w-5 h-5 object-contain" />
                        : <span className="text-indigo-400 text-xs font-bold">{b.merchant?.name?.[0]}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-sm font-medium text-gray-700 truncate">{b.merchant?.name}</span>
                        <span className="text-sm font-semibold text-gray-900 ml-2">{formatCurrency(b.total)}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-indigo-400 transition-all"
                          style={{ width: `${(b.total / topTotal) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0 w-12 text-right">{b.count} txns</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">No merchant data for this period</div>
          )}
        </Card>
      </div>
    </div>
  );
}
