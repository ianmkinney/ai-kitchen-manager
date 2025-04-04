import Link from 'next/link';

export default function Pantry() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Pantry Management</h1>
        <Link href="/" className="btn-secondary">
          Back to Home
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Inventory Section */}
        <section className="card md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Current Inventory</h2>
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              placeholder="Add new item..."
              className="input-field"
            />
            <button className="btn-primary whitespace-nowrap">
              Add Item
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['Vegetables', 'Fruits', 'Proteins', 'Grains'].map((category) => (
              <div key={category} className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-2">{category}</h3>
                <p className="text-gray-500 text-sm">No items added yet</p>
              </div>
            ))}
          </div>
        </section>

        {/* Shopping List Section */}
        <section className="card">
          <h2 className="text-xl font-semibold mb-4">Shopping List</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Add item to list..."
                className="input-field"
              />
              <button className="btn-primary whitespace-nowrap">
                Add
              </button>
            </div>
            <div className="h-96 bg-gray-50 rounded-lg p-4">
              <p className="text-gray-500 text-center mt-32">
                Your shopping list is empty
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
} 