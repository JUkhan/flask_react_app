
import { useState, useRef } from 'react'
import { setState, useAppStore } from './appStore'

export default function VideoUpload() {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResult, setUploadResult] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const fileInputRef = useRef(null)

  const ALLOWED_FORMATS = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv', '.mkv']
  const MAX_SIZE = 100 * 1024 * 1024 // 100MB

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return

    // Validate file type
    const fileExtension = '.' + selectedFile.name.split('.').pop().toLowerCase()
    if (!ALLOWED_FORMATS.includes(fileExtension)) {
      alert('Please select a valid video file format')
      return
    }

    // Validate file size
    if (selectedFile.size > MAX_SIZE) {
      alert('File too large. Maximum size is 100MB')
      return
    }

    setFile(selectedFile)
    setUploadResult(null)
    setUploadProgress(0)

    // Create preview URL
    const url = URL.createObjectURL(selectedFile)
    setPreviewUrl(url)
  }

  const handleInputChange = (e) => {
    const selectedFile = e.target.files[0]
    handleFileSelect(selectedFile)
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const droppedFile = e.dataTransfer.files[0]
    handleFileSelect(droppedFile)
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setUploadProgress(0)

    const formData = new FormData()
    formData.append('video', file)

    try {
      const xhr = new XMLHttpRequest()

      // Track upload progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100
          setUploadProgress(Math.round(percentComplete))
        }
      }

      // Handle completion
      xhr.onload = () => {
        if (xhr.status === 200) {
          const result = JSON.parse(xhr.responseText)
          setState({
            video: result.filename,
            image: result.image,
            uploaded: true,
          })

          setUploadResult(result)
          setFile(null)
          setPreviewUrl(null)
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
        } else {
          const error = JSON.parse(xhr.responseText)
          throw new Error(error.error || 'Upload failed')
        }
        setUploading(false)
      }

      xhr.onerror = () => {
        throw new Error('Network error occurred')
      }

      xhr.open('POST', '/api/upload-video')
      xhr.send(formData)
    } catch (error) {
      console.error('Upload error:', error)
      setUploadResult({ error: error.message })
      setUploading(false)
    }
  }

  const clearSelection = () => {
    setFile(null)
    setPreviewUrl(null)
    setUploadResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const store = useAppStore()
  if (store.uploaded) return <div></div>
  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">Video Upload</h2>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
          dragActive
            ? 'border-blue-500 bg-blue-50 transform scale-105'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleInputChange}
          className="hidden"
          id="videoInput"
          accept="video/*"
        />

        <label htmlFor="videoInput" className="cursor-pointer">
          <div className="text-gray-600">
            <svg
              className="mx-auto h-16 w-16 mb-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <p className="text-lg mb-2">
              <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
            </p>
            <p className="text-sm text-gray-500">MP4, WebM, AVI, MOV up to 100MB</p>
            <p className="text-xs text-gray-400 mt-1">
              Supported formats: {ALLOWED_FORMATS.join(', ')}
            </p>
          </div>
        </label>
      </div>

      {/* Video Preview */}
      {previewUrl && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">Preview</h3>
            <button onClick={clearSelection} className="text-red-500 hover:text-red-700 text-sm">
              Clear
            </button>
          </div>
          <div className="bg-black rounded-lg overflow-hidden">
            <video
              src={previewUrl}
              controls
              className="w-full h-64 object-contain"
              preload="metadata"
            />
          </div>
        </div>
      )}

      {/* File Info */}
      {file && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-600">
                {formatFileSize(file.size)} • {file.type}
              </p>
            </div>
            <div className="text-green-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {uploading && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Uploading...</span>
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

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className={`w-full mt-6 py-3 px-6 rounded-lg font-semibold text-lg transition-all duration-200 ${
          !file || uploading
            ? 'bg-gray-300 cursor-not-allowed text-gray-500'
            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-1'
        }`}
      >
        {uploading ? `Uploading... ${uploadProgress}%` : 'Upload Video'}
      </button>

      {/* Upload Result */}
      {uploadResult && (
        <div
          className={`mt-6 p-4 rounded-lg ${
            uploadResult.error
              ? 'bg-red-50 border border-red-200'
              : 'bg-green-50 border border-green-200'
          }`}
        >
          {uploadResult.error ? (
            <div className="text-red-700">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="font-semibold">Upload Failed</span>
              </div>
              <p>{uploadResult.error}</p>
            </div>
          ) : (
            <div className="text-green-700">
              <div className="flex items-center mb-3">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="font-semibold">Upload Successful!</span>
              </div>

              <div className="space-y-2 text-sm">
                <p>
                  <strong>File:</strong> {uploadResult.originalName}
                </p>
                <p>
                  <strong>Size:</strong> {uploadResult.sizeFormatted}
                </p>
                <p>
                  <strong>Type:</strong> {uploadResult.type}
                </p>
                <p>
                  <strong>Uploaded:</strong> {new Date(uploadResult.uploadedAt).toLocaleString()}
                </p>
              </div>

              <div className="mt-4 p-3 bg-white rounded border">
                <video
                  src={uploadResult.url}
                  controls
                  className="w-full h-48 object-contain rounded"
                  preload="metadata"
                />
              </div>

              <div className="mt-3 flex gap-2">
                <a
                  href={uploadResult.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  Open in New Tab
                </a>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(window.location.origin + uploadResult.url)
                  }
                  className="inline-flex items-center px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
                >
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Copy URL
                </button>
                <button
                  onClick={() => setState({ uploaded: true })}
                  className="inline-flex items-center px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
                >
                  Count
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
