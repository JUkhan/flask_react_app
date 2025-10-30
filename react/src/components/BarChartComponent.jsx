import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useComponentData } from './useComponentData';
import { Edit2, X, GripVertical, Settings } from 'lucide-react';
import { getColorsFromScheme } from './colorSchemes';

const BarChartComponent = ({ id, title, onRemove, onEdit, data, columns, query, json_config, isQueryEditable, onToggleQueryEditable }) => {
  const xdata = useComponentData(query, data);
  console.log('BarChartComponent title:', title);

  // Get configuration from json_config or use defaults
  const config = json_config?.chart || {
    showLegend: true,
    legendPosition: 'top',
    showGrid: true,
    showTooltip: true,
    beginAtZero: true,
    colorScheme: 'default',
    animationEnabled: true,
    animationDuration: 1000
  };

  // Get colors from the selected scheme
  const chartColors = getColorsFromScheme(config.colorScheme, 1);

  return <div className="bg-white rounded-lg shadow-lg p-6 relative group">
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center gap-2">
        <div className="drag-handle cursor-move opacity-50 hover:opacity-100 transition-opacity">
          <GripVertical size={20} className="text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onToggleQueryEditable && onToggleQueryEditable(id)}
          className={`p-1 transition-colors ${
            isQueryEditable
              ? 'text-red-500 hover:text-red-700'
              : 'text-gray-400 hover:text-gray-600'
          }`}
          title="Toggle query editing"
        >
          <Settings size={16} />
        </button>
        <button
          onClick={() => onEdit(id, title)}
          className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
          title="Edit component"
        >
          <Edit2 size={16} />
        </button>
        <button
          onClick={() => onRemove(id)}
          className="p-1 text-gray-500 hover:text-red-600 transition-colors"
          title="Remove component"
        >
          <X size={16} />
        </button>
      </div>
    </div>
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={xdata}>
        {config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
        <XAxis dataKey={columns[0]} />
        <YAxis domain={config.beginAtZero ? [0, 'auto'] : ['auto', 'auto']} />
        {config.showTooltip && <Tooltip />}
        {config.showLegend && <Legend verticalAlign={config.legendPosition} />}
        <Bar
          dataKey={columns[1]}
          fill={chartColors[0]}
          isAnimationActive={config.animationEnabled}
          animationDuration={config.animationDuration}
        />
      </BarChart>
    </ResponsiveContainer>
  </div>
}
export default BarChartComponent;