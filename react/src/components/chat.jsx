import { useNavigate } from '@tanstack/react-router';
import React, { useState, useRef, useEffect } from 'react';
import {takeDecision} from "./Search"
import { MicIcon, SignalHighIcon, Loader2Icon, BarChart3, TrendingUp, DonutIcon, PieChart as PieChartIcon, Grid3X3 } from 'lucide-react';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useDashboardStore, addComponentState, setDashboardState } from './appStore';
import TableComponent from './TableComponent';
import LineChartComponent from './LineChartComponent';
import BarChartComponent from './BarChartComponent';
import PieChartComponent from './PieChartComponent';

export default function ChatPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! How can I help you today?", sender: "bot", timestamp: new Date(), error: '', hasSql: false }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const [isLoading, setLoading] = useState(false);
  const dashboard = useDashboardStore();
  const [editableComponentId, setEditableComponentId] = useState(null);
  const [hasVirginEditableComponent, setHasVirginEditableComponent] = useState(false);
  const [isComponentUpdated, setIsComponentUpdated] = useState(false);

  // Check if any component has query edit mode enabled
  const hasEditableComponent = () => {
    return dashboard.components.some(comp => comp.isQueryEditable);
  };

  // Track which component is editable
  useEffect(() => {
    const editableComp = dashboard.components.find(comp => comp.isQueryEditable);
    if (editableComp) {
      setEditableComponentId(editableComp.id);
      setHasVirginEditableComponent(true);
      console.log('Editable component set:', editableComp.id);
    } else {
      setEditableComponentId(null);
      setHasVirginEditableComponent(false);
    }
  }, [dashboard.components]);

  // Start a new conversation
  const startNewConversation = () => {
    setMessages([
      { id: 1, text: "Hello! How can I help you today?", sender: "bot", timestamp: new Date(), error: '', hasSql: false }
    ]);
    setInputValue('');
    console.log('Started new conversation');
  };

  // Disable query edit mode for all components
  const disableQueryEditMode = () => {
    const updatedComponents = dashboard.components.map(comp => ({
      ...comp,
      isQueryEditable: false
    }));
    setDashboardState({ components: updatedComponents });
    console.log('Disabled query edit mode for all components');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  const {recognitionRef, text, interimText, setError, isListening, setIsListening, setText, setInterimText} =useSpeechRecognition()
  //console.log('intrimtext:', interimText)
  //console.log('text:', text)
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(()=>{
    setInputValue(interimText||text)
  },[interimText, text])

  useEffect(() => {
    fetch('/api/get-bot-messages/' + (sessionStorage.getItem('userId')||'123'))
      .then(response => response.json())  
      .then(data => {
        if (data.messages && data.messages.length > 0) {
          const initialMessages = data.messages.map((msg, index) => ({
            id: index + 1,
            text: msg.text,
            sender: msg.sender,
            hasSql: msg.sender==='bot'? (msg.text.startsWith('SELECT') || msg.text.startsWith('select')): false,
            timestamp: new Date()
          }));
          setMessages(initialMessages);
        }
      })  
  }, []);

  const handleSendMessage = async () => {
    if (inputValue.trim() === '') return;

    const newMessage = {
      id: messages.length + 1,
      text: inputValue,
      sender: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    let userInput = inputValue;
    setInputValue('');
    setIsTyping(true);

    // Special logic for query edit mode
    if (editableComponentId) {
      const component = dashboard.components.find(comp => comp.id === editableComponentId);
      const inputLower = userInput.toLowerCase();

      // Handle "make [chart type]" commands
      if (inputLower.startsWith('make')) {
        const keywords = ['line', 'bar', 'pie', 'donut', 'table'];
        const chartType = keywords.find(keyword => inputLower.includes(keyword));

        if (chartType && component?.query) {
          // Execute existing query and convert to new chart type
          loadQueryForEditableComponent(component.query, chartType);
          return;
        }
      }

      // For first message in edit mode, prepend the original SQL query
      if (component?.query && hasVirginEditableComponent) {
        userInput = `Based on the following SQL query: ${component.query}, please regenerate the query adding following statement: ${userInput}`;
        setHasVirginEditableComponent(false);
      }

      console.log('Query edit mode - modified input:', userInput);
      setIsComponentUpdated(false);
    }

    // Send message to backend
    const botResponse = {
      id: messages.length + 2,
      text: "Thanks for your message! This is a demo response.",
      sender: "bot",
      timestamp: new Date()
    };

    fetch('/api/get-query-result', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_input: userInput, thread_id: sessionStorage.getItem('userId')||'123'})
    })
    .then(response => response.json())
    .then(data => {
      console.log('Bot response:', data);
      takeDecision(data);
      botResponse.text = data.query?data.query:'Your query description is not sufficient to generate a valid query.';
      botResponse.timestamp = new Date();
      botResponse.hasSql = data.query? (data.query.startsWith('SELECT') || data.query.startsWith('select')): false;
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);

      // Auto-update component if in edit mode
      if (editableComponentId && data.query && !isComponentUpdated) {
        const component = dashboard.components.find(comp => comp.id === editableComponentId);
        if (component) {
          setTimeout(() => {
            addComponent(component.type)();
            setIsComponentUpdated(true);
          }, 500);
        }
      }
    })
    .catch(error => {
      console.error('Error fetching bot response:', error);
      takeDecision(error);
      setIsTyping(false);
    });
  };

  const loadSqlData = (sql) => {
    if (!sql) return;
    setLoading(true);
    fetch('/api/get-query-result2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql })
    })
    .then(response => response.json())
    .then(data => {
      setLoading(false);
      data.query= sql;
      takeDecision(data);
    })
    .catch(error => {
      setLoading(false);
      error.query = sql;
      takeDecision(error);
      console.error('Error fetching SQL data:', error);
    });
  };

  // Load query for editable component and convert to new chart type
  const loadQueryForEditableComponent = (sql, chartType) => {
    if (!sql) return;
    setIsTyping(true);

    fetch('/api/get-query-result2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql })
    })
    .then(response => response.json())
    .then(data => {
      console.log('Query executed for edit mode:', data);
      data.query = sql;
      takeDecision(data);

      // Add bot response with the SQL
      const botResponse = {
        id: messages.length + 2,
        text: sql,
        sender: "bot",
        timestamp: new Date(),
        hasSql: sql.startsWith('SELECT') || sql.startsWith('select')
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);

      // Update component with new chart type after data is loaded
      setTimeout(() => {
        addComponent(chartType)();
      }, 500);
    })
    .catch(error => {
      console.error('Error loading query for edit mode:', error);
      error.query = sql;
      takeDecision(error);
      setIsTyping(false);
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const toggleListening = () => {
    try {
      if (isListening) {
        recognitionRef.current.stop();
      } else {
        setText('');
        setInterimText('');
        setError('');
        recognitionRef.current.start();
      }
      setIsListening(!isListening);
    } catch (err) {
      setError(`Failed to ${isListening ? 'stop' : 'start'} speech recognition: ${err.message}`);
    }
  };

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

  const addComponent = (type) => () => {
    console.log('Adding component:', type);
    const componentType = componentTypes.find(c => c.type === type);
    console.log('Component found:', componentType);
    if (!componentType || dashboard.columns.length === 0) return;

    const newComponent = {
      id: Number(new Date().getTime()),
      type: type,
      title: componentType.defaultTitle,
      component: componentType.component,
      data: dashboard.data,
      query: dashboard.query || '',
      columns: dashboard.columns,
      isQueryEditable: false,
      user_id: sessionStorage.getItem('userId') || '',
      json_config: undefined
    };

    console.log('Adding new component:', newComponent);

    // Check if in edit mode - update existing component instead of creating new one
    if (editableComponentId) {
      const existingComponent = dashboard.components.find(comp => comp.id === editableComponentId);
      if (existingComponent) {
        newComponent.id = editableComponentId;
        newComponent.isQueryEditable = true;

        // Preserve existing json_config from the old component
        if (existingComponent.json_config) {
          // If type changed, clear chart/table specific config
          if (type !== existingComponent.type) {
            existingComponent.json_config.chart = undefined;
            existingComponent.json_config.table = undefined;
          }
          newComponent.json_config = existingComponent.json_config;
        }

        // Update component in state
        const updatedComponents = dashboard.components.map(comp =>
          comp.id === editableComponentId ? { ...newComponent } : comp
        );
        setDashboardState({ components: updatedComponents });

        // Update on server
        if (newComponent.user_id) {
          const serverComponent = { ...newComponent };
          serverComponent.columns = serverComponent.columns.join(',');
          delete serverComponent.component;
          delete serverComponent.data;

          // Update json_config with lastModified timestamp
          if (serverComponent.json_config) {
            const config = typeof serverComponent.json_config === 'string'
              ? JSON.parse(serverComponent.json_config)
              : serverComponent.json_config;
            config.lastModified = new Date().toISOString();
            config.updatedFrom = 'chat';
            serverComponent.json_config = JSON.stringify(config);
          }

          fetch(`/api/dashboard/${serverComponent.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(serverComponent),
          })
          .then(response => response.json())
          .then(data => {
            console.log('Component updated on server:', data);
          })
          .catch(error => {
            console.error('Error updating component:', error);
          });
        }
        return;
      }
    }

    // Not in edit mode - create new component
    // First add component to state WITHOUT json_config (like Angular does)
    addComponentState(newComponent);

    if(newComponent.user_id) {
      const copyComponent = { ...newComponent };
      copyComponent.columns = copyComponent.columns.join(',');
      delete copyComponent.component;
      delete copyComponent.data;

      // Calculate grid position AFTER adding to state (using NEW length like Angular)
      const currentComponents = dashboard.components;
      const index = currentComponents.length;
      const col = index % 2;
      const row = Math.floor(index / 2);

      // Prepare json_config with grid layout and metadata
      copyComponent.json_config = JSON.stringify({
        grid: {
          x: col * 6,
          y: row * 4,
          w: 6,
          h: 4
        },
        createdAt: new Date().toISOString(),
        version: '1.0',
        source: 'chat'
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
        console.log('Component saved to server:', data);
        // Update the component with server-generated ID and json_config (like Angular line 468-474)
        const updatedComponent = {
          ...newComponent,
          id: data.id,
          json_config: JSON.parse(copyComponent.json_config)
        };

        // Remove the temporary component and add the updated one
        let components = dashboard.components.filter(comp => comp.id !== newComponent.id);
        components.unshift(updatedComponent);
        setDashboardState({ components });
        console.log('Component updated with json_config:', updatedComponent);
      })
      .catch(error => {
        console.error('Error saving component:', error);
      });
    }
  }

  return (
    <div className={`fixed top-4 right-4 ${isOpen?'z-50':''}`}>
      {/* Chat Toggle Button */}
      <button
        onClick={() =>{
           setIsOpen(!isOpen);
           if(window.location.pathname !== '/dashboard') {
            console.log('Redirecting to dashboard');
             navigate({ 
        to: '/dashboard',
        replace: true 
      })
           }
        }}
        className={`mb-4 -mt-2 p-3 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 ${
          isOpen 
            ? 'bg-red-500 hover:bg-red-600 text-white' 
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Chat Window */}
      <div className={`bg-white rounded-lg shadow-2xl border transition-all duration-300 transform ${
        isOpen 
          ? 'opacity-100 scale-100 translate-y-0' 
          : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
      }`} style={{ width: '400px', height: '500px' }}>
        
        {/* Chat Header */}
        <div className="bg-blue-500 text-white p-4 rounded-t-lg flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <h3 className="font-semibold">Chat Support</h3>
            {/* New Conversation Button */}
            <button
              onClick={startNewConversation}
              className="hover:rounded-lg hover:bg-red-600 p-1 transition-colors"
              title="New Conversation"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
            {/* Query Edit Mode Active Indicator */}
            {hasEditableComponent() && (
              <button
                onClick={disableQueryEditMode}
                className="hover:rounded-lg hover:bg-red-600 p-1 transition-colors"
                title="Query edit mode is active"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-blue-200 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ height: '360px' }}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  message.sender === 'user'
                    ? 'bg-blue-500 text-white rounded-br-none'
                    : 'bg-blue-200 text-gray-800 rounded-bl-none relative group'
                }`}
              >
                {message.hasSql && message.text!==dashboard.query ?<button
                disabled={isLoading}
          onClick={() => loadSqlData(message.text)}
          title='Click to load data'
          className="p-1 cursor-pointer opacity-0 group-hover:opacity-100 absolute -top-1 -right-1 text-red-400 hover:text-red-600 transition-colors"
        >
          {isLoading?<Loader2Icon className={` w-4 h-4`}/>:<SignalHighIcon className={` w-4 h-4`} />}
        </button>:null}
                <div className="text-sm">
                {message.hasSql && message.text==dashboard.query?
                <React.Fragment>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {componentTypes.map(({type, name, icon:Icon}) => (
                      <button onClick={addComponent(type)} key={type} className={` px-2 py-1 text-xs rounded cursor-pointer bg-gray-100 hover:text-fuchsia-700 transition-colors shadow-md`}>
                        <Icon className="w-4 h-4 inline-block mr-1" />
                        {name}
                      </button>))}
                  </div>
                  {componentTypes.length==0 && dashboard.error?
                  <div className="text-red-500">{dashboard.error}</div>:null}
                  </React.Fragment>:
                <span>{message.text||message.error}</span>}
                </div>
                <p className={`text-xs mt-1 ${
                  message.sender === 'user' ? 'text-blue-200' : 'text-gray-500'
                }`}>
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          ))}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg rounded-bl-none">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t p-4">
          <div className="flex space-x-2">
            <button
              onClick={toggleListening}
              className={`px-4 py-2 ${isListening?'bg-red-500':'bg-blue-500'} text-white rounded-lg hover:${isListening?'bg-red-600':'bg-blue-600'} focus:outline-none focus:ring-2 focus:${isListening?'ring-red-500':'ring-blue-500'} disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors`}
            >
              <MicIcon className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSendMessage}
		          disabled={inputValue.trim() === ''}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
            
          </div>
        </div>
      </div>
    </div>
  );
}