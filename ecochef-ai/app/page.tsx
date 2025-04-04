import Link from 'next/link';

interface FeatureCardProps {
  title: string;
  description: string;
  link: string;
  icon?: string;
}

function FeatureCard({ title, description, link, icon = '🍽️' }: FeatureCardProps) {
  return (
    <Link href={link} className="card flex flex-col items-center hover:border-primary-300">
      <div className="text-4xl mb-4">{icon}</div>
      <h2 className="text-xl font-semibold mb-2 text-center">{title}</h2>
      <p className="text-gray-600 text-center">{description}</p>
      <div className="mt-4 text-primary-600 font-medium">Explore →</div>
    </Link>
  );
}

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl md:text-5xl font-bold text-center mb-6">
        Welcome to <span className="text-primary-600">EcoChef AI</span>
      </h1>
      <p className="text-xl text-center text-gray-600 max-w-2xl mx-auto mb-12">
        Your personalized AI kitchen assistant for sustainable and delicious meals
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <FeatureCard
          title="Meal Planning"
          description="Get personalized meal suggestions based on your preferences and available ingredients"
          link="/meal-planning"
          icon="📝"
        />
        <FeatureCard
          title="Pantry Management"
          description="Track your ingredients and get smart shopping suggestions"
          link="/pantry"
          icon="🥕"
        />
        <FeatureCard
          title="Dietary Quiz"
          description="Discover your perfect diet with our interactive quiz"
          link="/preferences/quiz"
          icon="🥗"
        />
      </div>

      <div className="mt-12 bg-primary-50 p-8 rounded-xl border border-primary-100">
        <h2 className="text-2xl font-bold text-center mb-4">Ready to reduce food waste?</h2>
        <p className="text-center mb-6">Take our dietary preferences quiz to get started</p>
        <div className="flex justify-center">
          <Link href="/preferences/quiz" className="btn-primary">
            Start the Quiz
          </Link>
        </div>
      </div>
    </div>
  );
} 