'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useDrag } from 'react-dnd';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Enhanced Recipe interface that includes both search results and custom/weekly plan recipes
interface Recipe {
  id?: number | string;  // Updated to accept string IDs for custom recipes
  title?: string;
  name?: string; // For compatibility with meal planning
  description?: string;
  image?: string;
  difficulty?: string;
  time?: string;
  cuisine?: string;
  mealType?: string;
  ingredients?: string[];
  instructions?: string[];
  isCustom?: boolean;
}

// ItemType for drag and drop
const ItemType = {
  RECIPE: 'recipe',
};

// RecipeCard component for displaying detailed recipe information
function RecipeCard({ recipe, onEdit, onDelete }: { 
  recipe: Recipe; 
  onEdit?: (recipe: Recipe) => void;
  onDelete?: (recipe: Recipe) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  
  // Use title or name (whichever is available)
  const displayTitle = recipe.title || recipe.name || 'Unnamed Recipe';
  
  // Setup drag functionality for recipes
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemType.RECIPE,
    item: { 
      recipe: {
        name: displayTitle,
        ingredients: recipe.ingredients || [],
        instructions: recipe.instructions || []
      } 
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div 
      ref={drag as any}
      className={`p-4 bg-gray-50 rounded-lg shadow hover:shadow-md transition-shadow ${isDragging ? 'opacity-50' : ''}`}
      style={{ cursor: 'move' }}
    >
      <div className="relative h-40 bg-gray-200 rounded-lg mb-3 overflow-hidden">
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="text-xs">{recipe.cuisine || 'Custom'} Recipe</span>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="font-medium text-lg">{displayTitle}</h3>
          {recipe.isCustom && (
            <div className="flex space-x-2">
              {onEdit && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(recipe);
                  }}
                  className="text-blue-500 hover:text-blue-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
              {onDelete && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(recipe);
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
        {recipe.description && (
          <p className="text-sm text-gray-600">{recipe.description}</p>
        )}
        <div className="flex justify-between text-xs text-gray-500">
          <span>{recipe.cuisine || 'Custom'} {recipe.difficulty ? `• ${recipe.difficulty}` : ''}</span>
          <span>{recipe.time || 'Varies'}</span>
        </div>

        <button 
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-blue-600 hover:text-blue-800 text-sm focus:outline-none"
        >
          {expanded ? 'Hide details' : 'Show details'}
        </button>

        {expanded && (
          <div className="mt-3 text-sm border-t pt-3">
            {recipe.ingredients && recipe.ingredients.length > 0 && (
              <div className="mb-3">
                <h4 className="font-medium mb-1">Ingredients:</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {recipe.ingredients.map((ingredient, idx) => (
                    <li key={idx}>{ingredient}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {recipe.instructions && recipe.instructions.length > 0 && (
              <div>
                <h4 className="font-medium mb-1">Instructions:</h4>
                <ol className="list-decimal pl-5 space-y-1">
                  {recipe.instructions.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CookingAssistant() {
  // State for recipes
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // State for cooking assistant
  const [assistantMessage, setAssistantMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [conversation, setConversation] = useState<{role: 'user' | 'assistant', content: string}[]>([]);

  // Custom recipe states
  const [customRecipes, setCustomRecipes] = useState<Recipe[]>([]);
  const [isAddingRecipe, setIsAddingRecipe] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [newRecipe, setNewRecipe] = useState<Recipe>({
    name: '',
    ingredients: [''],
    instructions: [''],
    isCustom: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false); // New state for submission status
  
  // Weekly plan recipes state
  const [weeklyPlanRecipes, setWeeklyPlanRecipes] = useState<Recipe[]>([]);

  // Fetch initial recipes on page load
  useEffect(() => {
    fetchRecipes();
    fetchCustomRecipes();
    fetchWeeklyPlanRecipes();
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

  // Fetch custom recipes from database API
  const fetchCustomRecipes = async () => {
    try {
      // Fetch custom recipes from API
      const response = await fetch('/api/custom-recipes');
      if (response.ok) {
        const data = await response.json();
        setCustomRecipes(data.customRecipes || []);
      } else {
        console.error('Error response from custom recipes API:', response.status);
      }
    } catch (error) {
      console.error('Error fetching custom recipes:', error);
    }
  };

  // Fetch recipes from the weekly plan
  const fetchWeeklyPlanRecipes = async () => {
    try {
      const response = await fetch('/api/weekly-plan');
      if (response.ok) {
        const data = await response.json();
        if (data.weeklyPlan) {
          const planRecipes: Recipe[] = [];
          
          // Extract unique recipes from each day and meal time
          Object.keys(data.weeklyPlan).forEach(day => {
            if (day !== 'weekStartDate') {
              ['breakfast', 'lunch', 'dinner'].forEach(mealTime => {
                if (Array.isArray(data.weeklyPlan[day][mealTime])) {
                  data.weeklyPlan[day][mealTime].forEach((recipe: Recipe) => {
                    // Check if recipe with same name already exists in array
                    if (!planRecipes.some(r => r.name === recipe.name)) {
                      planRecipes.push(recipe);
                    }
                  });
                }
              });
            }
          });
          
          setWeeklyPlanRecipes(planRecipes);
        }
      }
    } catch (error) {
      console.error('Error fetching weekly plan recipes:', error);
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

  // Handle adding or updating a custom recipe
  const handleSaveCustomRecipe = async () => {
    if (!newRecipe.name) {
      alert('Recipe name is required');
      return;
    }

    try {
      setIsSubmitting(true);

      if (editingRecipe && editingRecipe.id) {
        // Update existing recipe
        const response = await fetch('/api/custom-recipes', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: editingRecipe.id,
            name: newRecipe.name,
            ingredients: newRecipe.ingredients || [],
            instructions: newRecipe.instructions || [],
            cuisine: newRecipe.cuisine,
            description: newRecipe.description,
            difficulty: newRecipe.difficulty,
            time: newRecipe.time
          }),
        });

        if (response.ok) {
          const data = await response.json();
          // Update the recipe in the local state
          setCustomRecipes(prevRecipes => 
            prevRecipes.map(recipe => 
              recipe.id === editingRecipe.id ? { ...data.recipe, isCustom: true } : recipe
            )
          );
          alert('Recipe updated successfully!');
        } else {
          const errorData = await response.json();
          alert(`Failed to update recipe: ${errorData.error || 'Unknown error'}`);
        }
      } else {
        // Add new recipe
        const response = await fetch('/api/custom-recipes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: newRecipe.name,
            ingredients: newRecipe.ingredients || [],
            instructions: newRecipe.instructions || [],
            cuisine: newRecipe.cuisine,
            description: newRecipe.description,
            difficulty: newRecipe.difficulty,
            time: newRecipe.time
          }),
        });

        if (response.ok) {
          const data = await response.json();
          // Add the new recipe to the local state
          setCustomRecipes(prevRecipes => [...prevRecipes, { ...data.recipe, isCustom: true }]);
          alert('Recipe created successfully!');
        } else {
          const errorData = await response.json();
          alert(`Failed to create recipe: ${errorData.error || 'Unknown error'}`);
        }
      }

      // Reset form
      setNewRecipe({
        name: '',
        ingredients: [''],
        instructions: [''],
        isCustom: true
      });
      setIsAddingRecipe(false);
      setEditingRecipe(null);
    } catch (error) {
      console.error('Error saving custom recipe:', error);
      alert('An error occurred while saving the recipe. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle updating ingredients
  const handleIngredientChange = (index: number, value: string) => {
    const updatedIngredients = [...(newRecipe.ingredients || [''])];
    updatedIngredients[index] = value;
    setNewRecipe({ ...newRecipe, ingredients: updatedIngredients });
  };

  // Add a new ingredient field
  const addIngredient = () => {
    setNewRecipe({ 
      ...newRecipe, 
      ingredients: [...(newRecipe.ingredients || []), ''] 
    });
  };

  // Remove an ingredient field
  const removeIngredient = (index: number) => {
    const updatedIngredients = [...(newRecipe.ingredients || [''])];
    if (updatedIngredients.length > 1) {
      updatedIngredients.splice(index, 1);
      setNewRecipe({ ...newRecipe, ingredients: updatedIngredients });
    }
  };

  // Handle updating instructions
  const handleInstructionChange = (index: number, value: string) => {
    const updatedInstructions = [...(newRecipe.instructions || [''])];
    updatedInstructions[index] = value;
    setNewRecipe({ ...newRecipe, instructions: updatedInstructions });
  };

  // Add a new instruction field
  const addInstruction = () => {
    setNewRecipe({ 
      ...newRecipe, 
      instructions: [...(newRecipe.instructions || []), ''] 
    });
  };

  // Remove an instruction field
  const removeInstruction = (index: number) => {
    const updatedInstructions = [...(newRecipe.instructions || [''])];
    if (updatedInstructions.length > 1) {
      updatedInstructions.splice(index, 1);
      setNewRecipe({ ...newRecipe, instructions: updatedInstructions });
    }
  };

  // Edit a custom recipe
  const handleEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setNewRecipe({
      ...recipe,
      isCustom: true
    });
    setIsAddingRecipe(true);
  };

  // Delete a custom recipe
  const handleDeleteRecipe = async (recipeToDelete: Recipe) => {
    if (!recipeToDelete.id) {
      alert('Cannot delete recipe without an ID');
      return;
    }

    if (confirm('Are you sure you want to delete this recipe?')) {
      try {
        const response = await fetch(`/api/custom-recipes?id=${recipeToDelete.id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          // Remove the recipe from local state
          setCustomRecipes(prevRecipes => 
            prevRecipes.filter(recipe => recipe.id !== recipeToDelete.id)
          );
          alert('Recipe deleted successfully!');
        } else {
          const errorData = await response.json();
          alert(`Failed to delete recipe: ${errorData.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error deleting custom recipe:', error);
        alert('An error occurred while deleting the recipe. Please try again.');
      }
    }
  };
  
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Cooking Assistant</h1>
          <div className="flex gap-4">
            <button 
              onClick={() => {
                setIsAddingRecipe(!isAddingRecipe);
                setEditingRecipe(null);
                setNewRecipe({
                  name: '',
                  ingredients: [''],
                  instructions: [''],
                  isCustom: true
                });
              }}
              className="btn-primary"
            >
              {isAddingRecipe ? 'Cancel' : 'Add Custom Recipe'}
            </button>
            <Link href="/" className="btn-secondary">
              Back to Home
            </Link>
          </div>
        </div>

        {isAddingRecipe && (
          <div className="card mb-8">
            <h2 className="text-xl font-semibold mb-4">{editingRecipe ? 'Edit Recipe' : 'Add Custom Recipe'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Recipe Name</label>
                <input
                  type="text"
                  className="input-field w-full"
                  value={newRecipe.name || ''}
                  onChange={(e) => setNewRecipe({ ...newRecipe, name: e.target.value })}
                  placeholder="Enter recipe name"
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium">Ingredients</label>
                  <button 
                    type="button"
                    className="text-blue-600 hover:text-blue-800 text-xs"
                    onClick={addIngredient}
                  >
                    + Add Ingredient
                  </button>
                </div>
                {newRecipe.ingredients?.map((ingredient, index) => (
                  <div key={index} className="flex mb-2">
                    <input
                      type="text"
                      className="input-field w-full"
                      value={ingredient}
                      onChange={(e) => handleIngredientChange(index, e.target.value)}
                      placeholder={`Ingredient ${index + 1}`}
                    />
                    <button 
                      type="button"
                      className="ml-2 text-red-500 hover:text-red-700"
                      onClick={() => removeIngredient(index)}
                      disabled={newRecipe.ingredients?.length === 1}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium">Instructions</label>
                  <button 
                    type="button"
                    className="text-blue-600 hover:text-blue-800 text-xs"
                    onClick={addInstruction}
                  >
                    + Add Step
                  </button>
                </div>
                {newRecipe.instructions?.map((instruction, index) => (
                  <div key={index} className="flex mb-2">
                    <input
                      type="text"
                      className="input-field w-full"
                      value={instruction}
                      onChange={(e) => handleInstructionChange(index, e.target.value)}
                      placeholder={`Step ${index + 1}`}
                    />
                    <button 
                      type="button"
                      className="ml-2 text-red-500 hover:text-red-700"
                      onClick={() => removeInstruction(index)}
                      disabled={newRecipe.instructions?.length === 1}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="pt-2 flex justify-end">
                <button 
                  type="button"
                  className="btn-primary"
                  onClick={handleSaveCustomRecipe}
                >
                  {editingRecipe ? 'Update Recipe' : 'Save Recipe'}
                </button>
              </div>
            </div>
          </div>
        )}

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
              
              {customRecipes.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-3">Your Custom Recipes</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {customRecipes.map((recipe, index) => (
                      <RecipeCard 
                        key={`custom-${index}`} 
                        recipe={recipe} 
                        onEdit={handleEditRecipe} 
                        onDelete={handleDeleteRecipe} 
                      />
                    ))}
                  </div>
                </div>
              )}

              {weeklyPlanRecipes.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-3">Recipes From Your Weekly Plan</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Drag these recipes to your meal plan to reuse them.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {weeklyPlanRecipes.map((recipe, index) => (
                      <RecipeCard key={`weekly-${index}`} recipe={recipe} />
                    ))}
                  </div>
                </div>
              )}
              
              <h3 className="text-lg font-medium mb-3">Recipe Search Results</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recipes.length > 0 ? (
                  recipes.map((recipe) => (
                    <RecipeCard key={recipe.id} recipe={recipe} />
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
    </DndProvider>
  );
}