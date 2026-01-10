export default function HomePage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Welcome to Knowledge Distiller</h1>
      <p className="mb-4">
        An AI-powered system for curating, distilling, and organizing knowledge.
      </p>
      <div className="grid grid-cols-3 gap-4">
        <a href="/today" className="border p-4 rounded hover:bg-gray-50">
          <h2 className="font-bold mb-2">Today</h2>
          <p className="text-sm">View recent agent runs and traces</p>
        </a>
        <a href="/library" className="border p-4 rounded hover:bg-gray-50">
          <h2 className="font-bold mb-2">Library</h2>
          <p className="text-sm">Browse your knowledge base</p>
        </a>
        <a href="/ingest" className="border p-4 rounded hover:bg-gray-50">
          <h2 className="font-bold mb-2">Ingest</h2>
          <p className="text-sm">Add new content to process</p>
        </a>
      </div>
    </div>
  );
}
