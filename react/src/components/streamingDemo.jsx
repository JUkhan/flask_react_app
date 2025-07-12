
import { useState } from 'react'

export default function StreamingDemo() {
  const [messages, setMessages] = useState([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState(null)

  const startStreaming = async () => {
    setIsStreaming(true)
    setMessages([])
    setError(null)

    try {
      const response = await fetch('/api/stream')

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          console.log('Stream completed')
          break
        }

        const chunk = decoder.decode(value)
        console.log('Received chunk:', chunk)

        // Add each chunk to messages
        setMessages((prev) => [...prev, chunk.trim()])
      }
    } catch (err) {
      console.error('Streaming error:', err)
      setError(err.message)
    } finally {
      setIsStreaming(false)
    }
  }

  const clearMessages = () => {
    setMessages([])
    setError(null)
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Next.js Streaming API Demo</h1>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={startStreaming}
          disabled={isStreaming}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: isStreaming ? '#ccc' : '#007cba',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isStreaming ? 'not-allowed' : 'pointer',
          }}
        >
          {isStreaming ? 'Streaming...' : 'Start Stream'}
        </button>

        <button
          onClick={clearMessages}
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Clear
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: '10px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            marginBottom: '20px',
          }}
        >
          Error: {error}
        </div>
      )}

      <div
        style={{
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          minHeight: '200px',
          maxHeight: '400px',
          overflowY: 'auto',
        }}
      >
        <h3>Streamed Messages:</h3>
        {messages.length === 0 && !isStreaming && (
          <p style={{ color: '#666' }}>No messages yet. Click &quot;Start Stream&quot; to begin.</p>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            style={{
              padding: '5px 0',
              borderBottom: '1px solid #eee',
              fontFamily: 'monospace',
            }}
          >
            <strong>#{index + 1}:</strong> {message}
          </div>
        ))}

        {isStreaming && (
          <div
            style={{
              color: '#007cba',
              fontStyle: 'italic',
              marginTop: '10px',
            }}
          >
            🔄 Streaming in progress...
          </div>
        )}
      </div>

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p>
          <strong>How it works:</strong>
        </p>
        <ul>
          <li>The API sends 10 chunks of data, one per second</li>
          <li>Each chunk appears immediately when received</li>
          <li>The stream completes after all chunks are sent</li>
        </ul>
      </div>
    </div>
  )
}
