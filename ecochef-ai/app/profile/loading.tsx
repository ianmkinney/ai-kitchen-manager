export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="h-10 w-64 bg-gray-200 animate-pulse rounded"></div>
        <div className="h-10 w-32 bg-gray-200 animate-pulse rounded"></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="card">
          <div className="h-8 w-48 bg-gray-200 animate-pulse rounded mb-6"></div>
          <div className="space-y-4">
            <div className="h-6 w-full bg-gray-200 animate-pulse rounded"></div>
            <div className="h-6 w-3/4 bg-gray-200 animate-pulse rounded"></div>
            <div className="h-6 w-5/6 bg-gray-200 animate-pulse rounded"></div>
            <div className="h-6 w-2/3 bg-gray-200 animate-pulse rounded"></div>
            <div className="h-10 w-full bg-gray-200 animate-pulse rounded mt-4"></div>
          </div>
        </div>
        
        <div className="card">
          <div className="h-8 w-56 bg-gray-200 animate-pulse rounded mb-6"></div>
          <div className="space-y-4">
            <div className="h-24 w-full bg-gray-200 animate-pulse rounded"></div>
            <div className="h-6 w-5/6 bg-gray-200 animate-pulse rounded"></div>
            <div className="h-6 w-4/5 bg-gray-200 animate-pulse rounded"></div>
            <div className="h-10 w-40 bg-gray-200 animate-pulse rounded mx-auto mt-4"></div>
          </div>
        </div>
      </div>
    </div>
  );
} 