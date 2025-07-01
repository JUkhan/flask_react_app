

import React, { useRef, useEffect, useState } from 'react'

const CattleImageEnhancer = () => {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [croppedImage, setCroppedImage] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [mouseState, setMouseState] = useState({
    lastX: 0,
    lastY: 0,
    currentX: 0,
    currentY: 0,
    isDown: false,
  })
  const [rectangles, setRectangles] = useState([])
  const [currentRect, setCurrentRect] = useState({ x: 0, y: 0, width: 0, height: 0 })

  useEffect(() => {
    startCapture()
  }, [])

  useEffect(() => {
    redrawCanvas()
  }, [rectangles])

  const startCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false,
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.error('Error starting capture:', err)
    }
  }

  const resizeCanvas = () => {
    if (videoRef.current && canvasRef.current) {
      canvasRef.current.width = videoRef.current.offsetWidth
      canvasRef.current.height = videoRef.current.offsetHeight
      console.log('Canvas resized:', canvasRef.current.width, canvasRef.current.height)
      redrawCanvas()
    }
  }

  const redrawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw all existing rectangles
    ctx.strokeStyle = 'red'
    ctx.lineWidth = 2
    rectangles.forEach((rect, index) => {
      ctx.beginPath()
      ctx.rect(rect.x, rect.y, rect.width, rect.height)
      ctx.stroke()

      // Add rectangle number
      ctx.fillStyle = 'red'
      ctx.font = '14px Arial'
      ctx.fillText(`${index + 1}`, rect.x + 5, rect.y + 20)
    })

    // Draw current rectangle being drawn
    if (mouseState.isDown) {
      ctx.beginPath()
      ctx.rect(currentRect.x, currentRect.y, currentRect.width, currentRect.height)
      ctx.strokeStyle = 'blue'
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
      lastX: x,
      lastY: y,
      isDown: true,
    })

    setCurrentRect({ x, y, width: 0, height: 0 })
  }

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current
    if (!canvas || !mouseState.isDown) return

    const canvasRect = canvas.getBoundingClientRect()
    const x = parseInt(e.clientX - canvasRect.left)
    const y = parseInt(e.clientY - canvasRect.top)

    const width = x - mouseState.lastX
    const height = y - mouseState.lastY

    setCurrentRect({
      x: mouseState.lastX,
      y: mouseState.lastY,
      width,
      height,
    })

    setMouseState({
      ...mouseState,
      currentX: x,
      currentY: y,
    })

    redrawCanvas()
  }

  const handleMouseUp = () => {
    if (
      mouseState.isDown &&
      (Math.abs(currentRect.width) > 5 || Math.abs(currentRect.height) > 5)
    ) {
      // Normalize rectangle (handle negative width/height)
      const normalizedRect = {
        x: currentRect.width < 0 ? currentRect.x + currentRect.width : currentRect.x,
        y: currentRect.height < 0 ? currentRect.y + currentRect.height : currentRect.y,
        width: Math.abs(currentRect.width),
        height: Math.abs(currentRect.height),
      }

      setRectangles((prev) => [...prev, normalizedRect])
    }

    setMouseState({
      ...mouseState,
      isDown: false,
    })

    setCurrentRect({ x: 0, y: 0, width: 0, height: 0 })
  }

  const handleSnip = () => {
    if (rectangles.length === 0) {
      // If no rectangles, capture the entire canvas
      videoToCroppedImage({ x: 0, y: 0, width: 0, height: 0 })
    } else {
      // Capture the first rectangle (you can modify this logic as needed)
      videoToCroppedImage(rectangles[0])
    }
    setUploadStatus('')
  }

  const handleSnipAll = () => {
    if (rectangles.length === 0) return

    // Create a composite image with all rectangles
    const canvas = canvasRef.current
    if (!canvas) return

    const tempCanvas = document.createElement('canvas')
    const video = videoRef.current

    // Calculate total area needed
    const padding = 10
    let totalWidth = 0
    let maxHeight = 0

    rectangles.forEach((rect) => {
      totalWidth += rect.width + padding
      maxHeight = Math.max(maxHeight, rect.height)
    })

    const aspectRatioY = video.videoHeight / canvas.height
    const aspectRatioX = video.videoWidth / canvas.width

    tempCanvas.width = totalWidth * aspectRatioX
    tempCanvas.height = maxHeight * aspectRatioY

    const ctx = tempCanvas.getContext('2d')
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)

    let currentX = 0
    rectangles.forEach((rect) => {
      ctx.drawImage(
        video,
        rect.x * aspectRatioX,
        rect.y * aspectRatioY,
        rect.width * aspectRatioX,
        rect.height * aspectRatioY,
        currentX,
        0,
        rect.width * aspectRatioX,
        rect.height * aspectRatioY,
      )
      currentX += (rect.width + padding) * aspectRatioX
    })

    const dataURI = tempCanvas.toDataURL('image/jpeg')
    setCroppedImage(dataURI)
  }

  const handleClearRectangles = () => {
    setRectangles([])
  }

  const handleRemoveLastRectangle = () => {
    setRectangles((prev) => prev.slice(0, -1))
  }

  const handleUpload = async () => {
    if (!croppedImage) {
      setUploadStatus('No image to upload. Please crop an image first.')
      return
    }

    setIsUploading(true)
    setUploadStatus('')

    try {
      // Convert data URL to blob
      const response = await fetch(croppedImage)
      const blob = await response.blob()

      // Create FormData
      const formData = new FormData()
      formData.append('image', blob, 'cropped-image.jpg')

      // Replace this URL with your actual upload endpoint
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (uploadResponse.ok) {
        const result = await uploadResponse.json()
        setUploadStatus('Count:' + result.reduce((acc, item) => acc + item.count, 0))
        console.log('Upload successful:', result)
      } else {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`)
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus(`Upload failed: ${error.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  const videoToCroppedImage = ({ width, height, x, y }) => {
    const video = videoRef.current
    const canvas = canvasRef.current
    console.log('Cropping video to image:', { width, height, x, y })
    if (width === 0) {
      width = canvas.width
    }
    if (height === 0) {
      height = canvas.height
    }
    if (!video || !canvas) return

    const aspectRatioY = video.videoHeight / canvas.height
    const aspectRatioX = video.videoWidth / canvas.width

    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = width * aspectRatioX
    tempCanvas.height = height * aspectRatioY

    const ctx = tempCanvas.getContext('2d')
    ctx.drawImage(
      video,
      x * aspectRatioX,
      y * aspectRatioY,
      width * aspectRatioX,
      height * aspectRatioY,
      0,
      0,
      tempCanvas.width,
      tempCanvas.height,
    )

    const dataURI = tempCanvas.toDataURL('image/jpeg')
    setCroppedImage(dataURI)
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Animal Counter</h1>

      <div className="relative w-full h-96 overflow-hidden mb-4 border border-gray-300">
        <video ref={videoRef} autoPlay onPlay={resizeCanvas} className="absolute h-full w-auto" />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 z-10 bg-opacity-25 cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          Rectangles drawn: {rectangles.length} | Click and drag to draw rectangles
        </p>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={handleSnip}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Snip First
        </button>

        <button
          onClick={handleSnipAll}
          disabled={rectangles.length === 0}
          className={`font-bold py-2 px-4 rounded ${
            rectangles.length === 0
              ? 'bg-gray-400 cursor-not-allowed text-gray-700'
              : 'bg-purple-500 hover:bg-purple-700 text-white'
          }`}
        >
          Snip All ({rectangles.length})
        </button>

        <button
          onClick={handleUpload}
          disabled={!croppedImage || isUploading}
          className={`font-bold py-2 px-4 rounded ${
            !croppedImage || isUploading
              ? 'bg-gray-400 cursor-not-allowed text-gray-700'
              : 'bg-green-500 hover:bg-green-700 text-white'
          }`}
        >
          {isUploading ? 'Uploading...' : 'Count'}
        </button>

        <button
          onClick={handleRemoveLastRectangle}
          disabled={rectangles.length === 0}
          className={`font-bold py-2 px-4 rounded ${
            rectangles.length === 0
              ? 'bg-gray-400 cursor-not-allowed text-gray-700'
              : 'bg-orange-500 hover:bg-orange-700 text-white'
          }`}
        >
          Remove Last
        </button>

        <button
          onClick={handleClearRectangles}
          disabled={rectangles.length === 0}
          className={`font-bold py-2 px-4 rounded ${
            rectangles.length === 0
              ? 'bg-gray-400 cursor-not-allowed text-gray-700'
              : 'bg-red-500 hover:bg-red-700 text-white'
          }`}
        >
          Clear All
        </button>
      </div>

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

      {croppedImage && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">Cropped Image:</h2>
          <img
            src={croppedImage}
            alt="Cropped screen capture"
            className="border border-gray-300 max-w-full h-auto"
          />
        </div>
      )}
    </div>
  )
}

export default CattleImageEnhancer
