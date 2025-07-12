import React, { useState, useCallback } from 'react';
import { Plus, BarChart3, TrendingUp, DonutIcon, PieChart as PieChartIcon, Grid3X3 } from 'lucide-react';
import { useDashboardStore, addComponentState, updateComponentState, removeComponentState, setDashboardState } from './appStore';
import { useEffect } from 'react';
import TableComponent from './TableComponent';
import LineChartComponent from './LineChartComponent';
import BarChartComponent from './BarChartComponent';
import PieChartComponent from './PieChartComponent';


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
  const [editTitle, setEditTitle] = useState('');
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
            data=data.map(component => {
              component.columns = component.columns.split(',').map(col => col.trim());
              return component;
            });
          console.log('Processed dashboard data:', data);
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
          components.unshift({ ...newComponent, id: data.id });
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
    setEditingComponent(id);
    setEditTitle(currentTitle);
  }, []);

  const saveEdit = useCallback(() => {
    const component= dashboard.components.find(comp => comp.id === editingComponent);
    updateComponentState({...component, title:editTitle});
    setEditingComponent(null);
    setEditTitle('');
    if (component && component.user_id) {
      fetch(`/api/dashboard/${component.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: editTitle }),
      })
      .then(response => response.json())
      .then(data => {
        console.log('Component updated successfully:', data);
      })
      .catch(error => {
        console.error('Error updating component:', error);
      });
    }
  }, [dashboard.components, editingComponent, editTitle]);

  const cancelEdit = useCallback(() => {
    setEditingComponent(null);
    setEditTitle('');
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

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage your components dynamically</p>
          </div>
          
          {/* Add Component Button */}
          <div className="relative">
            {dashboard.columns.length ? <button
              onClick={() =>{ setShowAddMenu(!showAddMenu);console.log('Add Component clicked');}}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-md"
            >
              <Plus size={20} />
              Add Component
            </button>:null}
            
            {/* Add Component Menu */}
            
            {showAddMenu && (
              <div className="absolute right-0 top-12 bg-white rounded-lg shadow-xl border z-10 min-w-48">
                <div className="py-2">
                  {componentTypes.map((type) => {
                    const IconComponent = type.icon;
                    return (
                      <button
                        key={type.type}
                        onClick={() => addComponent(type.type, componentTypes)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
                      >
                        <IconComponent size={18} className="text-gray-600" />
                        <span className="text-gray-700">{type.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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
            {/* <button
              onClick={() => setShowAddMenu(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Add Your First Component
            </button> */}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6">
            {dashboard.components.map((comp) => {
              const ComponentToRender = componentMapByType[comp.type] || TableComponent;
              return (
                <div key={comp.id} className="relative">
                  <ComponentToRender
                    id={comp.id}
                    title={comp.title}
                    onRemove={removeComponent}
                    onEdit={startEditing}
                    data={comp.data} 
                    columns={comp.columns} 
                    query={comp.query}
                    type={comp.type}
                    onColumnsChange={handleColumnsChange}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Edit Modal */}
        {editingComponent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
              <h3 className="text-lg font-semibold mb-4">Edit Component Title</h3>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter component title"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={saveEdit}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={cancelEdit}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

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