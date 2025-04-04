import Link from 'next/link';

export default function Recipes() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Recipe Assistant</h1>
        <Link href="/" className="btn-secondary">
          Back to Home
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Recipe Search */}
        <section className="card md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Find Recipes</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Search recipes or ask for cooking advice..."
                className="input-field"
              />
              <button className="btn-primary whitespace-nowrap">
                Search
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4 bg-gray-50 rounded-lg">
                  <div className="h-32 bg-gray-200 rounded-lg mb-2" />
                  <h3 className="font-medium">Recipe Name</h3>
                  <p className="text-sm text-gray-500">Quick description</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cooking Assistant */}
        <section className="card">
          <h2 className="text-xl font-semibold mb-4">AI Cooking Assistant</h2>
          <div className="space-y-4">
            <div className="h-96 bg-gray-50 rounded-lg p-4">
              <p className="text-gray-500 text-center mt-32">
                Ask me anything about cooking!
              </p>
            </div>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Type your question..."
                className="input-field"
              />
              <button className="btn-primary whitespace-nowrap">
                Ask
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
} 