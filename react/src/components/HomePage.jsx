export default function HomePage() {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        Welcome to TanStack Router
      </h1>
      <p className="text-xl text-gray-600 mb-8">
        A fully type-safe router for React applications
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Type Safety</h3>
          <p className="text-gray-600">Full TypeScript support with type-safe routing</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">File-based Routing</h3>
          <p className="text-gray-600">Organize routes with file-system based routing</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Search Params</h3>
          <p className="text-gray-600">Built-in search parameter validation</p>
        </div>
      </div>
    </div>
  );
}