import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const getDefaultConfig = (type) => {
  const defaults = {
    showLegend: true,
    legendPosition: 'top',
    responsive: true,
    maintainAspectRatio: true,
    animationEnabled: true,
    animationDuration: 1000,
    animationEasing: 'easeOutQuad',
    colorScheme: 'default',
    borderWidth: 2,
    showTooltip: true,
    showTitle: false,
    titlePosition: 'top',
    titleAlign: 'center'
  };

  if (type === 'line') {
    return {
      ...defaults,
      showGrid: true,
      showXAxis: true,
      showYAxis: true,
      beginAtZero: true,
      tension: 0.4,
      fill: false,
      pointRadius: 3,
      pointStyle: 'circle'
    };
  } else if (type === 'bar') {
    return {
      ...defaults,
      showGrid: true,
      showXAxis: true,
      showYAxis: true,
      beginAtZero: true,
      barThickness: 'flex',
      maxBarThickness: 50
    };
  } else if (type === 'pie' || type === 'donut') {
    return {
      ...defaults,
      cutout: type === 'donut' ? '50%' : '0%',
      rotation: 0,
      circumference: 360
    };
  } else if (type === 'table') {
    return {
      showPagination: true,
      pageSize: 10,
      stripedRows: true,
      showBorders: true,
      hoverEffect: true,
      denseLayout: false,
      headerStyle: 'default',
      headerColor: '#3b82f6'
    };
  }

  return defaults;
};

const ComponentConfigModal = ({ isOpen, component, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [config, setConfig] = useState({});

  useEffect(() => {
    if (component) {
      setTitle(component.title || '');

      // Load existing config or use defaults
      let existingConfig = {};
      if (component.type === 'table' && component.json_config?.table) {
        existingConfig = component.json_config.table;
      } else if (component.type !== 'table' && component.json_config?.chart) {
        existingConfig = component.json_config.chart;
      }

      const defaultConfig = getDefaultConfig(component.type);
      setConfig({ ...defaultConfig, ...existingConfig });
    }
  }, [component]);

  if (!isOpen || !component) return null;

  const isTable = component.type === 'table';

  const handleConfigChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(title, config);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-6 text-gray-800">
          {isTable ? 'Configure Table' : 'Configure Chart'}
        </h3>

        {/* Title */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter title"
          />
        </div>

        <div className="space-y-6">
          {!isTable ? (
            <>
              {/* Chart Settings */}
              {/* Display Settings */}
              <div className="border-b pb-4">
                <h4 className="text-lg font-semibold mb-3 text-gray-700">Display Settings</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="showLegend"
                      checked={config.showLegend}
                      onChange={(e) => handleConfigChange('showLegend', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="showLegend" className="ml-2 text-sm text-gray-700">
                      Show Legend
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Legend Position</label>
                    <select
                      value={config.legendPosition}
                      onChange={(e) => handleConfigChange('legendPosition', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="top">Top</option>
                      <option value="bottom">Bottom</option>
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                    </select>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="showTooltip"
                      checked={config.showTooltip}
                      onChange={(e) => handleConfigChange('showTooltip', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="showTooltip" className="ml-2 text-sm text-gray-700">
                      Show Tooltip
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="responsive"
                      checked={config.responsive}
                      onChange={(e) => handleConfigChange('responsive', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="responsive" className="ml-2 text-sm text-gray-700">
                      Responsive
                    </label>
                  </div>
                </div>
              </div>

              {/* Animation Settings */}
              <div className="border-b pb-4">
                <h4 className="text-lg font-semibold mb-3 text-gray-700">Animation</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="animationEnabled"
                      checked={config.animationEnabled}
                      onChange={(e) => handleConfigChange('animationEnabled', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="animationEnabled" className="ml-2 text-sm text-gray-700">
                      Enable Animation
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Duration (ms)</label>
                    <input
                      type="number"
                      value={config.animationDuration}
                      onChange={(e) => handleConfigChange('animationDuration', parseInt(e.target.value))}
                      min="0"
                      max="5000"
                      step="100"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Color Settings */}
              <div className="border-b pb-4">
                <h4 className="text-lg font-semibold mb-3 text-gray-700">Colors</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Color Scheme</label>
                    <select
                      value={config.colorScheme}
                      onChange={(e) => handleConfigChange('colorScheme', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="default">Default</option>
                      <option value="pastel">Pastel</option>
                      <option value="vibrant">Vibrant</option>
                      <option value="monochrome">Monochrome</option>
                      <option value="cool">Cool</option>
                      <option value="warm">Warm</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Border Width</label>
                    <input
                      type="number"
                      value={config.borderWidth}
                      onChange={(e) => handleConfigChange('borderWidth', parseInt(e.target.value))}
                      min="0"
                      max="10"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Chart Type Specific Settings */}
              {config.showGrid !== undefined && (
                <div className="border-b pb-4">
                  <h4 className="text-lg font-semibold mb-3 text-gray-700">
                    {component.type === 'line' ? 'Line Chart' : 'Bar Chart'} Settings
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="showGrid"
                        checked={config.showGrid}
                        onChange={(e) => handleConfigChange('showGrid', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="showGrid" className="ml-2 text-sm text-gray-700">
                        Show Grid
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="beginAtZero"
                        checked={config.beginAtZero}
                        onChange={(e) => handleConfigChange('beginAtZero', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="beginAtZero" className="ml-2 text-sm text-gray-700">
                        Begin at Zero
                      </label>
                    </div>

                    {component.type === 'line' && (
                      <>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">
                            Line Tension (0-1)
                          </label>
                          <input
                            type="number"
                            value={config.tension}
                            onChange={(e) => handleConfigChange('tension', parseFloat(e.target.value))}
                            min="0"
                            max="1"
                            step="0.1"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="fill"
                            checked={config.fill}
                            onChange={(e) => handleConfigChange('fill', e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="fill" className="ml-2 text-sm text-gray-700">
                            Fill Area
                          </label>
                        </div>

                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Point Radius</label>
                          <input
                            type="number"
                            value={config.pointRadius}
                            onChange={(e) => handleConfigChange('pointRadius', parseInt(e.target.value))}
                            min="0"
                            max="10"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Point Style</label>
                          <select
                            value={config.pointStyle}
                            onChange={(e) => handleConfigChange('pointStyle', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="circle">Circle</option>
                            <option value="cross">Cross</option>
                            <option value="rect">Rectangle</option>
                            <option value="rectRounded">Rounded Rectangle</option>
                            <option value="triangle">Triangle</option>
                            <option value="star">Star</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {config.cutout !== undefined && (
                <div className="border-b pb-4">
                  <h4 className="text-lg font-semibold mb-3 text-gray-700">
                    Pie/Donut Settings
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Cutout (0-100%)
                      </label>
                      <input
                        type="text"
                        value={config.cutout}
                        onChange={(e) => handleConfigChange('cutout', e.target.value)}
                        placeholder="50%"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Rotation (degrees)
                      </label>
                      <input
                        type="number"
                        value={config.rotation}
                        onChange={(e) => handleConfigChange('rotation', parseInt(e.target.value))}
                        min="-360"
                        max="360"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Table Settings */}
              <div className="border-b pb-4">
                <h4 className="text-lg font-semibold mb-3 text-gray-700">Pagination</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="showPagination"
                      checked={config.showPagination}
                      onChange={(e) => handleConfigChange('showPagination', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="showPagination" className="ml-2 text-sm text-gray-700">
                      Show Pagination
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Page Size</label>
                    <select
                      value={config.pageSize}
                      onChange={(e) => handleConfigChange('pageSize', parseInt(e.target.value))}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-b pb-4">
                <h4 className="text-lg font-semibold mb-3 text-gray-700">Styling</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="stripedRows"
                      checked={config.stripedRows}
                      onChange={(e) => handleConfigChange('stripedRows', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="stripedRows" className="ml-2 text-sm text-gray-700">
                      Striped Rows
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="showBorders"
                      checked={config.showBorders}
                      onChange={(e) => handleConfigChange('showBorders', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="showBorders" className="ml-2 text-sm text-gray-700">
                      Show Borders
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="hoverEffect"
                      checked={config.hoverEffect}
                      onChange={(e) => handleConfigChange('hoverEffect', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="hoverEffect" className="ml-2 text-sm text-gray-700">
                      Hover Effect
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="denseLayout"
                      checked={config.denseLayout}
                      onChange={(e) => handleConfigChange('denseLayout', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="denseLayout" className="ml-2 text-sm text-gray-700">
                      Dense Layout
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Header Style</label>
                    <select
                      value={config.headerStyle}
                      onChange={(e) => handleConfigChange('headerStyle', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="default">Default</option>
                      <option value="bold">Bold</option>
                      <option value="colored">Colored</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Header Color</label>
                    <input
                      type="color"
                      value={config.headerColor}
                      onChange={(e) => handleConfigChange('headerColor', e.target.value)}
                      className="w-full h-8 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-6 justify-end">
          <button
            onClick={onClose}
            className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComponentConfigModal;
