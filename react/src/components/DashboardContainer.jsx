import React, { useState, useCallback, useMemo } from 'react';
import { Plus, BarChart3, TrendingUp, DonutIcon, PieChart as PieChartIcon, Grid3X3 } from 'lucide-react';
import { useDashboardStore, addComponentState, updateComponentState, removeComponentState, setDashboardState } from './appStore';
import { useEffect } from 'react';
import TableComponent from './TableComponent';
import LineChartComponent from './LineChartComponent';
import BarChartComponent from './BarChartComponent';
import PieChartComponent from './PieChartComponent';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import ComponentConfigModal from './ComponentConfigModal';


const componentMapByType = {
  'line': LineChartComponent,
  'bar': BarChartComponent,
  'pie': PieChartComponent, 
  'table': TableComponent,
  'donut': PieChartComponent, 
};
// Main Dashboard Container
const DashboardContainer = () => {
  //const [components, setComponents] = useState([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [editingComponent, setEditingComponent] = useState(null);
  const [gridLayout, setGridLayout] = useState([]);
  const dashboard=useDashboardStore()
  console.log('Dashboard data:', dashboard);
  useEffect(() => {
    const userId = sessionStorage.getItem('userId');
    if (userId) {
      console.log('User ID from sessionStorage:', userId);
      fetch(`/api/dashboards/${userId}`)
        .then(response => response.json())
        .then(response =>response.data)
        .then(data => {
          console.log('Fetched dashboard data:', data);
           const types=new Set(data.map(component => component.type));
           const savedLayout = [];

            data=data.map((component, index) => {
              component.columns = component.columns.split(',').map(col => col.trim());

              // Parse json_config if it exists
              if (component.json_config) {
                try {
                  if (typeof component.json_config === 'string') {
                    component.json_config = JSON.parse(component.json_config);
                  }
                } catch (error) {
                  console.warn('Failed to parse json_config for component', component.id, error);
                  component.json_config = null;
                }
              }

              // Extract grid layout from json_config
              if (component.json_config?.grid) {
                savedLayout.push({
                  i: String(component.id),
                  x: component.json_config.grid.x,
                  y: component.json_config.grid.y,
                  w: component.json_config.grid.w || 6,
                  h: component.json_config.grid.h || 4
                });
              }

              return component;
            });
          console.log('Processed dashboard data:', data);
          console.log('Saved layout positions:', savedLayout);

          // Set grid layout if we have saved positions
          if (savedLayout.length > 0) {
            setGridLayout(savedLayout);
          }

          setDashboardState({ components: data, types: Array.from(types)});

        })
    }
  }, []);
  
  const componentTypes=dashboard.types.reduce((acc, type) => {
    switch (type) {
      case 'line': 
        acc.push({ type: 'line', name: 'Line Chart', icon: TrendingUp, component: LineChartComponent, defaultTitle: 'Line Chart' });
        break;
      case 'bar':
        acc.push({ type: 'bar', name: 'Bar Chart', icon: BarChart3, component: BarChartComponent, defaultTitle: 'Bar Chart' });
        break;
      case 'pie':
        acc.push({ type: 'pie', name: 'Pie Chart', icon: PieChartIcon, component: PieChartComponent, defaultTitle: 'Pie Chart' });
        break;  
         case 'donut':
        acc.push({ type: 'donut', name: 'Donut Chart', icon: DonutIcon, component: PieChartComponent, defaultTitle: 'Donut Chart' });
        break;  
      case 'table':
        acc.push({ type: 'table', name: 'Table', icon: Grid3X3, component: TableComponent, defaultTitle: 'Table' });
        break;
    }
    return acc;
  },[])
  console.log('Component Types:', componentTypes);
  const addComponent = useCallback((type, componentTypes) => {
    const componentType = componentTypes.find(ct => ct.type === type);
    if (componentType) {
      const newComponent = {
        id: Number(new Date().getTime()),
        type: type,
        title: componentType.defaultTitle,
        component: componentType.component,
        data: dashboard.data,
        query: dashboard.query || '',
        columns: dashboard.columns,
        user_id: sessionStorage.getItem('userId') || '',
      };
      console.log('Adding new component:', newComponent);
      addComponentState(newComponent);
      if(newComponent.user_id) {
        const copyComponent = { ...newComponent };
        copyComponent.columns = copyComponent.columns.join(',');
        delete copyComponent.component;
        delete copyComponent.data;

        // Calculate default grid position for new component
        const index = dashboard.components.length;
        const col = index % 2;
        const row = Math.floor(index / 2);

        // Prepare json_config with grid layout
        copyComponent.json_config = JSON.stringify({
          grid: {
            x: col * 6,
            y: row * 4,
            w: 6,
            h: 4
          },
          createdAt: new Date().toISOString(),
          version: '1.0'
        });

        fetch('/api/dashboard', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(copyComponent),
        })
        .then(response => response.json())
        .then(data => data.dashboard)
        .then(data => {
          console.log('New component ID:', data.id, newComponent.id);
          let components=dashboard.components.filter(comp => comp.id !== newComponent.id);
          const updatedComponent = {
            ...newComponent,
            id: data.id,
            json_config: JSON.parse(copyComponent.json_config)
          };
          components.unshift(updatedComponent);
          console.log('Updated components:', components);
          setDashboardState({ components });
          console.log('Component added successfully:', data);
        })
        .catch(error => {
          console.error('Error adding component:', error);
        });
      }
    }
    setShowAddMenu(false);
  }, [dashboard]);

  const removeComponent = useCallback((id) => {
    console.log('Removing component with ID:', id, typeof id, dashboard.components);
    const component = dashboard.components.find(comp => comp.id === id);
    console.log('Component to remove:', component);
    removeComponentState(id);
    if (component && component.user_id) {
      fetch(`/api/dashboard/${component.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      .then(response => response.json())
      .then(() => {
        console.log('Component removed successfully');
      })  
      .catch(error => {
        console.error('Error removing component:', error);
      });
    }
  }, [dashboard.components]);

  const startEditing = useCallback((id, currentTitle) => {
    const component = dashboard.components.find(comp => comp.id === id);
    setEditingComponent(component);
  }, [dashboard.components]);

  const saveEdit = useCallback((title, config) => {
    const component = dashboard.components.find(comp => comp.id === editingComponent.id);
    if (component) {
      // Update component with new title and config
      const updatedConfig = { ...component.json_config };

      if (component.type === 'table') {
        updatedConfig.table = config;
      } else {
        updatedConfig.chart = config;
      }
      updatedConfig.lastModified = new Date().toISOString();

      const updatedComponent = {
        ...component,
        title: title,
        json_config: updatedConfig
      };
      updateComponentState(updatedComponent);

      // Update on server
      if (component.user_id) {
        fetch(`/api/dashboard/${component.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: title,
            json_config: JSON.stringify(updatedConfig)
          }),
        })
        .then(response => response.json())
        .then(data => {
          console.log('Component updated successfully:', data);
        })
        .catch(error => {
          console.error('Error updating component:', error);
        });
      }
    }
  }, [dashboard.components, editingComponent]);

  const cancelEdit = useCallback(() => {
    setEditingComponent(null);
  }, []);

  const handleColumnsChange = useCallback((id, newColumns) => {
    const component = dashboard.components.find(comp => comp.id === id);
    if (component) {
      const updatedComponent = { ...component, columns: newColumns };
      updateComponentState(updatedComponent);
      if (component.user_id) {
        fetch(`/api/dashboard/${component.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ columns: newColumns.join(',') }),
        })
        .then(response => response.json())
        .then(data => {
          console.log('Component columns updated successfully:', data);
        })
        .catch(error => {
          console.error('Error updating component columns:', error);
        });
      }
    }
    }, [dashboard.components]);

  const handleToggleQueryEditable = useCallback((id) => {
    const component = dashboard.components.find(comp => comp.id === id);
    if (component) {
      const updatedComponent = { ...component, isQueryEditable: !component.isQueryEditable };
      updateComponentState(updatedComponent);
      console.log('Toggled query editable for component:', id, 'to', updatedComponent.isQueryEditable);
    }
  }, [dashboard.components]);

  const handleLayoutChange = useCallback((newLayout) => {
    console.log('Layout changed:', newLayout);
    setGridLayout(newLayout);

    // Save layout to backend for each component
    newLayout.forEach(item => {
      const component = dashboard.components.find(c => String(c.id) === item.i);
      if (component && component.user_id) {
        // Get existing json_config or create new one
        const existingConfig = component.json_config || {};

        // Update grid layout in json_config
        const updatedConfig = {
          ...existingConfig,
          grid: {
            x: item.x,
            y: item.y,
            w: item.w,
            h: item.h
          },
          lastModified: new Date().toISOString()
        };

        fetch(`/api/dashboard/${component.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ json_config: JSON.stringify(updatedConfig) }),
        })
        .then(response => response.json())
        .then(() => {
          console.log(`Layout saved for component ${component.id}`);
        })
        .catch(error => {
          console.error('Error saving layout:', error);
        });
      }
    });
  }, [dashboard.components]);

  // Update grid layout when components change (add/remove)
  useEffect(() => {
    const currentLayout = gridLayout;
    const components = dashboard.components;

    // Only update if component count changed
    if (components.length !== currentLayout.length) {
      console.log('Component count changed, updating grid layout');
      const newLayout = components.map((component, index) => {
        // Check if component already has layout info
        const existingLayout = currentLayout.find(item => item.i === String(component.id));

        if (existingLayout) {
          return existingLayout;
        }

        // Check if component has saved grid layout in json_config
        if (component.json_config?.grid) {
          return {
            i: String(component.id),
            x: component.json_config.grid.x,
            y: component.json_config.grid.y,
            w: component.json_config.grid.w || 6,
            h: component.json_config.grid.h || 4
          };
        }

        // Create default layout for new components
        const col = index % 2;
        const row = Math.floor(index / 2);

        return {
          i: String(component.id),
          x: col * 6,
          y: row * 4,
          w: 6,
          h: 4
        };
      });

      setGridLayout(newLayout);
    }
  }, [dashboard.components]);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="w-full mx-auto" style={{ maxWidth: '1600px' }}>
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage your components dynamically</p>
          </div>

          {/* Add Component Button */}
          <div className="relative">

          </div>
        </div>

        {/* Components Grid */}
        {dashboard.components.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-200 rounded-full mb-4">
              <BarChart3 size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No components yet</h3>
            <p className="text-gray-500 mb-4">Start building your dashboard by adding some components</p>
          </div>
        ) : (
          <GridLayout
            className="layout"
            layout={gridLayout}
            cols={12}
            rowHeight={100}
            width={1550}
            margin={[16, 16]}
            containerPadding={[0, 0]}
            onLayoutChange={handleLayoutChange}
            draggableHandle=".drag-handle"
            compactType="vertical"
          >
            {dashboard.components.map((comp) => {
              const ComponentToRender = componentMapByType[comp.type] || TableComponent;
              return (
                <div key={String(comp.id)} className="relative">
                  <ComponentToRender
                    id={comp.id}
                    title={comp.title}
                    onRemove={removeComponent}
                    onEdit={startEditing}
                    data={comp.data}
                    columns={comp.columns}
                    query={comp.query}
                    type={comp.type}
                    json_config={comp.json_config}
                    isQueryEditable={comp.isQueryEditable}
                    onToggleQueryEditable={handleToggleQueryEditable}
                    onColumnsChange={handleColumnsChange}
                  />
                </div>
              );
            })}
          </GridLayout>
        )}

        {/* Component Configuration Modal */}
        <ComponentConfigModal
          isOpen={!!editingComponent}
          component={editingComponent}
          onClose={cancelEdit}
          onSave={saveEdit}
        />

        {/* Click outside to close menu */}
        {showAddMenu && (
          <div
            className="fixed inset-0 z-5"
            onClick={() => setShowAddMenu(false)}
          />
        )}
      </div>
    </div>
  );
};

export default DashboardContainer;