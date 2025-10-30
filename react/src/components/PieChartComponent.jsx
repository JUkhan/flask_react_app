
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useComponentData } from './useComponentData';
import { Edit2, X, GripVertical, Settings } from 'lucide-react';
import { getColorsFromScheme } from './colorSchemes';

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

const PieChartComponent = ({ id, title, onRemove, onEdit, data, columns , query, type='donut', json_config, isQueryEditable, onToggleQueryEditable  }) => {
   const xdata = useComponentData(query, data);

   // Get configuration from json_config or use defaults
   const config = json_config?.chart || {
     showLegend: true,
     legendPosition: 'top',
     showTooltip: true,
     cutout: type === 'donut' ? '50%' : '0%',
     rotation: 0,
     circumference: 360,
     colorScheme: 'default',
     animationEnabled: true,
     animationDuration: 1000
   };

   // Get colors from the selected scheme
   const chartColors = getColorsFromScheme(config.colorScheme, xdata.length);

   // Calculate cutout value (for donut charts)
   let innerRadius = 0;
   if (config.cutout && config.cutout !== '0%') {
     const cutoutPercent = parseInt(config.cutout);
     innerRadius = (80 * cutoutPercent) / 100;
   }

   let donut = {};
   if (type === 'donut' || innerRadius > 0) {
     donut = {
       innerRadius: innerRadius || 40,
       paddingAngle: 1,
       startAngle: config.rotation || 90,
       endAngle: config.rotation ? config.rotation - config.circumference : -270,
       labelLine: true
     };
   }

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
          isAnimationActive={config.animationEnabled}
          animationDuration={config.animationDuration}
          {...donut}
        >
          {xdata.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
          ))}
        </Pie>
        {config.showTooltip && <Tooltip content={<CustomTooltip columns={columns} />} />}
        {config.showLegend && <Legend verticalAlign={config.legendPosition} />}
      </PieChart>
    </ResponsiveContainer>
  </div>
}
export default PieChartComponent;

