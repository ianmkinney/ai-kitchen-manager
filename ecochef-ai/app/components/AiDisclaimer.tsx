export default function AiDisclaimer({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-blue-50 border border-blue-200 text-blue-800 rounded-md p-3 text-sm ${className}`}>
      <p>
        <span className="font-semibold">AI-Generated Content: </span>
        Information provided here is AI-generated and may occasionally contain inaccuracies or errors. 
        Please verify nutritional information and recipes before making health-related decisions.
      </p>
    </div>
  );
} 