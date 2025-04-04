import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-gradient-to-r from-primary-600 to-primary-500 text-white py-4 shadow-md">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold flex items-center gap-2">
          <span className="text-3xl">🥗</span> EcoChef AI
        </Link>
        
        <nav className="flex gap-6">
          <Link href="/meal-planning" className="hover:text-white/80 transition-colors">
            Meal Planning
          </Link>
          <Link href="/pantry" className="hover:text-white/80 transition-colors">
            Pantry
          </Link>
          <Link href="/recipes" className="hover:text-white/80 transition-colors">
            Recipes
          </Link>
          <Link href="/preferences/quiz" className="hover:text-white/80 transition-colors">
            Dietary Quiz
          </Link>
        </nav>
      </div>
    </header>
  );
} 