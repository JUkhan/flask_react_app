
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'; 
import { useComponentData, colors } from './useComponentData';
import { Edit2, X } from 'lucide-react';

const CustomTooltip = ({ active, payload, columns }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{data[columns[0]]}</p>
          <p className="text-sm text-gray-600">
            {columns[1]}: <span className="font-medium">{data[columns[1]]}</span>
          </p>
        </div>
      );
    }
    return null;
  };

const PieChartComponent = ({ id, title, onRemove, onEdit, data, columns , query, type='donut'  }) => {
   const xdata = useComponentData(query, data);
   let donut = {};
  if (type === 'donut') {
    donut = {
      innerRadius: 40,
      paddingAngle: 1,
      startAngle: 90,
      endAngle: -270,
      labelLine:true
    };
  }
  return <div className="bg-white rounded-lg shadow-lg p-6 relative group">
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(id, title)}
          className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
        >
          <Edit2 size={16} />
        </button>
        <button
          onClick={() => onRemove(id)}
          className="p-1 text-gray-500 hover:text-red-600 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={xdata}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={(obj) => `${obj[columns[0]]} ${(obj['percent'] * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey={columns[1]}
          {...donut}
        >
          {xdata.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip columns={columns} />} />
      </PieChart>
    </ResponsiveContainer>
  </div>
}
export default PieChartComponent;

