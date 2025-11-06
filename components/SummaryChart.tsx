
import React, { useMemo } from 'react';
import { Transaction, TransactionType } from '../types';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';

interface SummaryChartProps {
  transactions: Transaction[];
}

interface MonthlyData {
  name: string;
  income: number;
  expense: number;
}

const SummaryChart: React.FC<SummaryChartProps> = ({ transactions }) => {
  const chartData = useMemo<MonthlyData[]>(() => {
    const data: { [key: string]: { income: number; expense: number } } = {};

    transactions.forEach(t => {
      const month = new Date(t.date).toLocaleString('vi-VN', { month: '2-digit', year: 'numeric' });
      if (!data[month]) {
        data[month] = { income: 0, expense: 0 };
      }
      if (t.type === TransactionType.INCOME) {
        data[month].income += t.amount;
      } else {
        data[month].expense += t.amount;
      }
    });

    return Object.keys(data)
      .map(key => ({ name: key, income: data[key].income, expense: data[key].expense }))
      .sort((a, b) => {
          const [monthA, yearA] = a.name.split('/');
          const [monthB, yearB] = b.name.split('/');
          return new Date(`${yearA}-${monthA}-01`).getTime() - new Date(`${yearB}-${monthB}-01`).getTime();
      });
  }, [transactions]);

  if(transactions.length === 0) {
    return (
        <div className="flex items-center justify-center h-full text-gray-500">
            Chưa có dữ liệu để hiển thị biểu đồ.
        </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis
          tickFormatter={(value) => new Intl.NumberFormat('vi-VN', { notation: 'compact', compactDisplay: 'short' }).format(value as number)}
          tick={{ fontSize: 12 }}
          width={80}
        />
        <Tooltip
          formatter={(value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value as number)}
          cursor={{ fill: 'rgba(219, 234, 254, 0.5)'}}
        />
        <Legend wrapperStyle={{fontSize: "14px"}}/>
        <Bar dataKey="income" fill="#22c55e" name="Thu nhập" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" fill="#ef4444" name="Chi phí" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default SummaryChart;
