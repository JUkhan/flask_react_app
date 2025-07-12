import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useComponentData, colors } from './useComponentData';
import { Edit2, X } from 'lucide-react';

const LineChartComponent = ({ id, title, onRemove, onEdit, data, columns , query  }) => {
  const xdata = useComponentData(query, data);
  return (
  <div className="bg-white rounded-lg shadow-lg p-6 relative group">
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
      <LineChart data={xdata}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={columns[0]} />
        <YAxis />
        <Tooltip />
        <Legend />
        {columns.slice(1).map((col, index) => (
           <Line
              key={index}
              type="monotone"
              dataKey={col}
              stroke={colors[index % colors.length]}
              strokeWidth={ 2}
              name={col}
              dot={{ fill: colors[index % colors.length], strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: colors[index % colors.length], strokeWidth: 2 }}
            />
        ))}
      </LineChart>
    </ResponsiveContainer>
  </div>
);
}
export default LineChartComponent;