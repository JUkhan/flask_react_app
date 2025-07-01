

import React, { useRef, useState } from 'react'
import { setState, useAppStore } from './appStore'

const CattleImageEnhancer = () => {
  //const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  //const [croppedImage, setCroppedImage] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [mouseState, setMouseState] = useState({
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    isDrawing: false,
  })
  const [line, setLine] = useState({ startX: 0, startY: 0, endX: 0, endY: 0 })

  const startCapture = async () => {
    canvasRef.current.width = 860
    canvasRef.current.height = 480
    if (line.startX || line.startY || line.endX || line.endY) {
      // draw the line if it exists
      const ctx = canvasRef.current.getContext('2d')
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      ctx.beginPath()
      ctx.moveTo(line.startX, line.startY)
      ctx.lineTo(line.endX, line.endY)
      ctx.strokeStyle = 'red'
      ctx.lineWidth = 3
      ctx.stroke()
    }
  }

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = parseInt(e.clientX - rect.left)
    const y = parseInt(e.clientY - rect.top)

    setMouseState({
      ...mouseState,
      startX: x,
      startY: y,
      isDrawing: true,
    })
  }

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current
    if (!canvas || !mouseState.isDrawing) return

    const canvasRect = canvas.getBoundingClientRect()
    const x = parseInt(e.clientX - canvasRect.left)
    const y = parseInt(e.clientY - canvasRect.top)

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.beginPath()

    // Draw line from start point to current mouse position
    ctx.moveTo(mouseState.startX, mouseState.startY)
    ctx.lineTo(x, y)

    setLine({
      startX: mouseState.startX,
      startY: mouseState.startY,
      endX: x,
      endY: y,
    })

    ctx.strokeStyle = 'red'
    ctx.lineWidth = 3
    ctx.stroke()

    setMouseState({
      ...mouseState,
      endX: x,
      endY: y,
    })
  }

  const handleMouseUp = () => {
    setMouseState({
      ...mouseState,
      isDrawing: false,
    })
  }
  const store = useAppStore()
  const handleSnip = async () => {
    console.log('Snipping line:', line)
    if (!line.startX || !line.startY || !line.endX || !line.endY) {
      setUploadStatus('Please draw a line first.')
      return
    }
    try {
      setIsUploading(true)
      const response = await fetch(
        `/api/stream?video=${store.video}&line=${line.startX},${line.startY},${line.endX},${line.endY}`,
      )

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
        const obj = JSON.parse(chunk)
        //console.log(obj)
        setUploadStatus(() => `Count: ${obj.in + obj.out}`)
        const percentComplete = (obj.currentFrame / obj.totalFrames) * 100
        setUploadProgress(Math.round(percentComplete))
      }
    } catch (err) {
      console.error('Streaming error:', err)
      //setError(err.message)
    } finally {
      setIsUploading(false)
    }
  }

 
  if (!store.uploaded) return <div></div>
  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Counter</h1>

      <div className="relative w-full overflow-hidden mb-4 border border-gray-300">
        <img
          onLoad={() => startCapture()}
          src={store.image}
          alt="Description of the image"
          width={860}
          height={380}
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 z-10  bg-opacity-25 cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={handleSnip}
          disabled={isUploading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          {isUploading ? 'Counting...' : 'Count'}
        </button>

        <button
          onClick={() => setState({ uploaded: false })}
          className={`font-bold py-2 px-4 rounded bg-green-500 hover:bg-green-700 text-white`}
        >
          Upload Video
        </button>
      </div>

      {/* Progress Bar */}
      {isUploading && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Counting...</span>
            <span className="text-sm text-gray-600">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {uploadStatus && (
        <div
          className={`p-3 rounded mb-4 ${
            uploadStatus.includes('Count')
              ? 'bg-green-100 text-green-700 border border-green-300'
              : 'bg-red-100 text-red-700 border border-red-300'
          }`}
        >
          {uploadStatus}
        </div>
      )}
    </div>
  )
}

export default CattleImageEnhancer
