import DatabaseSetup from '../components/DatabaseSetup';

export default function SetupPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">EcoChef AI Setup</h1>
      <DatabaseSetup />
    </div>
  );
} 