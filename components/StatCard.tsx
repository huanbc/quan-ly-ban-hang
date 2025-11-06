
import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, color }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col justify-between transition-transform hover:scale-105">
      <p className="text-gray-500 font-medium">{title}</p>
      <p className={`text-2xl sm:text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
};

export default StatCard;
