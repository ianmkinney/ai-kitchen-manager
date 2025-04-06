'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Recipe {
  id: number;
  title: string;
  description: string;
  image: string;
  difficulty: string;
  time: string;
  cuisine: string;
  mealType: string;
}

export default function CookingAssistant() {
  // State for recipes
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // State for cooking assistant
  const [assistantMessage, setAssistantMessage] = useState('');
  const [assistantResponse, setAssistantResponse] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [conversation, setConversation] = useState<{role: 'user' | 'assistant', content: string}[]>([]);

  // Fetch initial recipes on page load
  useEffect(() => {
    fetchRecipes();
  }, []);

  // Function to search recipes
  const fetchRecipes = async (query: string = '') => {
    setIsSearching(true);
    try {
      const response = await fetch(`/api/recipe-search?query=${encodeURIComponent(query)}`);
      const data = await response.json();
      setRecipes(data.recipes);
    } catch (error) {
      console.error('Error fetching recipes:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle recipe search form submission
  const handleRecipeSearch = (e: FormEvent) => {
    e.preventDefault();
    fetchRecipes(searchQuery);
  };

  // Handle sending message to cooking assistant
  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!assistantMessage.trim() || isSendingMessage) return;
    
    const userMessage = assistantMessage.trim();
    setAssistantMessage('');
    setIsSendingMessage(true);
    
    // Add user message to conversation
    setConversation(prev => [...prev, { role: 'user', content: userMessage }]);
    
    try {
      const response = await fetch('/api/cooking-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      });
      
      const data = await response.json();
      
      // Add assistant response to conversation
      setConversation(prev => [...prev, { role: 'assistant', content: data.response }]);
      setAssistantResponse(data.response);
    } catch (error) {
      console.error('Error getting cooking assistant response:', error);
      setConversation(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again later.' 
      }]);
    } finally {
      setIsSendingMessage(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Cooking Assistant</h1>
        <Link href="/" className="btn-secondary">
          Back to Home
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recipe Search Section */}
        <section className="card lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Find Recipes</h2>
          <div className="space-y-6">
            <form onSubmit={handleRecipeSearch} className="flex gap-4">
              <input
                type="text"
                placeholder="Search for recipes..."
                className="input-field flex-grow"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button 
                type="submit" 
                className="btn-primary whitespace-nowrap"
                disabled={isSearching}
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </form>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recipes.length > 0 ? (
                recipes.map((recipe) => (
                  <div key={recipe.id} className="p-4 bg-gray-50 rounded-lg shadow hover:shadow-md transition-shadow">
                    <div className="relative h-40 bg-gray-200 rounded-lg mb-3 overflow-hidden">
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span className="text-xs">{recipe.cuisine} Cuisine</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-medium text-lg">{recipe.title}</h3>
                      <p className="text-sm text-gray-600">{recipe.description}</p>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{recipe.cuisine} • {recipe.difficulty}</span>
                        <span>{recipe.time}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 p-8 text-center text-gray-500">
                  No recipes found. Try a different search term.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Cooking Assistant Section */}
        <section className="card">
          <h2 className="text-xl font-semibold mb-4">Chef Claude</h2>
          <div className="mb-3 text-sm text-gray-600">
            <p>Ask me anything about:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Step-by-step cooking instructions</li>
              <li>Food safety questions</li>
              <li>Ingredient substitutions</li>
              <li>Cooking techniques</li>
              <li>Meal planning advice</li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <div className="h-96 bg-gray-50 rounded-lg p-4 overflow-y-auto">
              {conversation.length > 0 ? (
                <div className="space-y-4">
                  {conversation.map((message, index) => (
                    <div 
                      key={index} 
                      className={`p-3 rounded-lg ${
                        message.role === 'user' 
                          ? 'bg-blue-100 ml-4' 
                          : 'bg-green-50 mr-4'
                      }`}
                    >
                      <div className="text-xs font-semibold mb-1">
                        {message.role === 'user' ? 'You' : 'Chef Claude'}
                      </div>
                      <div className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center mt-32">
                  Ask me anything about cooking!
                </p>
              )}
            </div>
            
            <form onSubmit={handleSendMessage} className="flex gap-4">
              <input
                type="text"
                placeholder="Ask a cooking question..."
                className="input-field flex-grow"
                value={assistantMessage}
                onChange={(e) => setAssistantMessage(e.target.value)}
                disabled={isSendingMessage}
              />
              <button 
                type="submit" 
                className="btn-primary whitespace-nowrap"
                disabled={!assistantMessage.trim() || isSendingMessage}
              >
                {isSendingMessage ? 'Sending...' : 'Ask'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
} 