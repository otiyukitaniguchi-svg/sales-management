'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800">500</h1>
        <p className="text-lg text-gray-600 mt-2">エラーが発生しました</p>
        <button
          onClick={() => reset()}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          もう一度試す
        </button>
      </div>
    </div>
  )
}
