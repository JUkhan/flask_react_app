import { useNavigate } from '@tanstack/react-router';
import { useState, useRef, useEffect } from 'react';
import {takeDecision} from "./Search"
import { MicIcon, SignalHighIcon, Loader2Icon } from 'lucide-react';
import { useSpeechRecognition } from './useSpeechRecognition';


export default function ChatPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! How can I help you today?", sender: "bot", timestamp: new Date() }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const [isLoading, setLoading] = useState(false);

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
    setInputValue('');
    setIsTyping(true);

    // Simulate bot response
    
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
        body: JSON.stringify({ user_input: newMessage.text, thread_id: sessionStorage.getItem('userId')||'123'})
      })
      .then(response => response.json())
      .then(data => {
        console.log('Bot response:', data);
        takeDecision(data);
        botResponse.text = data.query?data.query:'Your query description is not sufficient to generate a valid query.';
        botResponse.timestamp = new Date();
        setMessages(prev => [...prev, botResponse]);
        setIsTyping(false);})
      .catch(error => {
        console.error('Error fetching bot response:', error);
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
      data.sql= sql;
      takeDecision(data);
    })
    .catch(error => {
      setLoading(false);
      console.error('Error fetching SQL data:', error);
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
                    : 'bg-gray-200 text-gray-800 rounded-bl-none relative group'
                }`}
              >
                {message.hasSql ?<button
                disabled={isLoading}
          onClick={() => loadSqlData(message.text)}
          title='Click to load data'
          className="p-1 cursor-pointer opacity-0 group-hover:opacity-100 absolute -top-1 -right-1 text-red-400 hover:text-red-600 transition-colors"
        >
          {isLoading?<Loader2Icon className={` w-4 h-4`}/>:<SignalHighIcon className={` w-4 h-4`} />}
        </button>:null}
                <p className="text-sm">{message.text}</p>
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
            <button
              onClick={toggleListening}
              className={`px-4 py-2 ${isListening?'bg-red-500':'bg-blue-500'} text-white rounded-lg hover:${isListening?'bg-red-600':'bg-blue-600'} focus:outline-none focus:ring-2 focus:${isListening?'ring-red-500':'ring-blue-500'} disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors`}
            >
              <MicIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}