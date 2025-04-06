'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Recipes() {
  const [searchQuery, setSearchQuery] = useState('');
  const [recipeResults, setRecipeResults] = useState<string>('');
  const [chatMessage, setChatMessage] = useState('');
  const [chatResponses, setChatResponses] = useState<{message: string, response: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);

  // Handle recipe search
  const handleRecipeSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setLoading(true);
      const res = await fetch('/api/recipes/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setRecipeResults(data.suggestions);
      } else {
        setRecipeResults('Failed to get recipe suggestions. Please try again.');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error searching recipes:', error);
      setRecipeResults('An error occurred while searching for recipes.');
      setLoading(false);
    }
  };

  // Handle chat assistant
  const handleChatQuestion = async () => {
    if (!chatMessage.trim()) return;
    
    try {
      setLoadingChat(true);
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: chatMessage }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setChatResponses([...chatResponses, {
          message: chatMessage,
          response: data.response
        }]);
        setChatMessage('');
      }
      
      setLoadingChat(false);
    } catch (error) {
      console.error('Error getting chat response:', error);
      setChatResponses([...chatResponses, {
        message: chatMessage,
        response: 'Sorry, I encountered an error. Please try again.'
      }]);
      setChatMessage('');
      setLoadingChat(false);
    }
  };

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
          <h2 className="text-xl font-semibold mb-4">Find Recipes Using Your Pantry</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Search recipes or ask for dish ideas..."
                className="input-field flex-1"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRecipeSearch()}
              />
              <button 
                className="btn-primary whitespace-nowrap"
                onClick={handleRecipeSearch}
                disabled={loading}
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
            
            {recipeResults ? (
              <div className="bg-gray-50 rounded-lg p-6 mt-4 whitespace-pre-line">
                {recipeResults}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-lg">
                    <div className="h-32 bg-gray-200 rounded-lg mb-2" />
                    <h3 className="font-medium">Search for recipes</h3>
                    <p className="text-sm text-gray-500">Get personalized suggestions based on your pantry</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Cooking Assistant */}
        <section className="card">
          <h2 className="text-xl font-semibold mb-4">AI Cooking Assistant</h2>
          <div className="space-y-4">
            <div className="h-96 bg-gray-50 rounded-lg p-4 overflow-y-auto">
              {chatResponses.length > 0 ? (
                <div className="space-y-4">
                  {chatResponses.map((exchange, i) => (
                    <div key={i}>
                      <div className="bg-blue-100 rounded-lg p-3 mb-2">
                        <p className="font-medium">You:</p>
                        <p>{exchange.message}</p>
                      </div>
                      <div className="bg-gray-100 rounded-lg p-3">
                        <p className="font-medium">Assistant:</p>
                        <p className="whitespace-pre-line">{exchange.response}</p>
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
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Type your question..."
                className="input-field flex-1"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleChatQuestion()}
              />
              <button 
                className="btn-primary whitespace-nowrap"
                onClick={handleChatQuestion}
                disabled={loadingChat}
              >
                {loadingChat ? 'Loading...' : 'Ask'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
} 