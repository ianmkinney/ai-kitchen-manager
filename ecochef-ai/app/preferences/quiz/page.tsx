'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// More complete set of quiz questions
const quizQuestions = [
  {
    id: 'dietary',
    question: 'Do you follow any specific dietary restrictions?',
    options: [
      { label: 'No restrictions', value: 'none' },
      { label: 'Vegetarian', value: 'vegetarian' },
      { label: 'Vegan', value: 'vegan' },
      { label: 'Gluten-Free', value: 'gluten-free' },
      { label: 'Dairy-Free', value: 'dairy-free' },
      { label: 'Nut-Free', value: 'nut-free' }
    ],
    allowMultiple: true,
  },
  {
    id: 'cooking-time',
    question: 'How much time do you typically have for cooking?',
    options: [
      { label: 'Very little (under 15 minutes)', value: '15' },
      { label: 'Some time (15-30 minutes)', value: '30' },
      { label: 'Moderate time (30-60 minutes)', value: '60' },
      { label: 'Plenty of time (60+ minutes)', value: '90' },
    ],
    allowMultiple: false,
  },
  {
    id: 'skill-level',
    question: 'How would you describe your cooking skill level?',
    options: [
      { label: 'Beginner - Basic cooking skills', value: 'beginner' },
      { label: 'Intermediate - Comfortable with most recipes', value: 'intermediate' },
      { label: 'Advanced - Experienced home cook', value: 'advanced' },
    ],
    allowMultiple: false,
  },
  {
    id: 'flavor-preferences',
    question: 'What flavor profiles do you prefer?',
    options: [
      { label: 'Spicy', value: 'spicy' },
      { label: 'Sweet', value: 'sweet' },
      { label: 'Savory', value: 'savory' },
      { label: 'Sour', value: 'sour' },
      { label: 'Bitter', value: 'bitter' },
    ],
    allowMultiple: true,
  },
  {
    id: 'cuisine',
    question: 'What is your favorite type of cuisine?',
    options: [
      { label: 'Italian', value: 'Italian' },
      { label: 'Mexican', value: 'Mexican' },
      { label: 'Asian', value: 'Asian' },
      { label: 'Mediterranean', value: 'Mediterranean' },
      { label: 'American', value: 'American' },
      { label: 'Indian', value: 'Indian' },
      { label: 'No preference', value: 'Any' },
    ],
    allowMultiple: false,
  },
  {
    id: 'preferred-cuisines',
    question: 'Which cuisines would you like to explore more?',
    options: [
      { label: 'Italian (pasta, pizza)', value: 'Italian' },
      { label: 'Mexican (tacos, enchiladas)', value: 'Mexican' },
      { label: 'Chinese (stir-fry, dumplings)', value: 'Chinese' },
      { label: 'Japanese (sushi, ramen)', value: 'Japanese' },
      { label: 'Indian (curry, naan)', value: 'Indian' },
      { label: 'Thai (pad thai, curry)', value: 'Thai' },
      { label: 'Mediterranean (hummus, falafel)', value: 'Mediterranean' },
      { label: 'American (burgers, BBQ)', value: 'American' },
    ],
    allowMultiple: true,
  },
  {
    id: 'people-count',
    question: 'How many people do you typically cook for?',
    options: [
      { label: 'Just me (1 person)', value: '1' },
      { label: 'Two people', value: '2' },
      { label: 'Small family (3-4 people)', value: '4' },
      { label: 'Large family (5+ people)', value: '6' },
    ],
    allowMultiple: false,
  },
  {
    id: 'allergies',
    question: 'Do you have any food allergies?',
    options: [
      { label: 'None', value: 'none' },
      { label: 'Peanuts', value: 'peanuts' },
      { label: 'Tree nuts', value: 'tree-nuts' },
      { label: 'Dairy', value: 'dairy' },
      { label: 'Eggs', value: 'eggs' },
      { label: 'Shellfish', value: 'shellfish' },
      { label: 'Wheat', value: 'wheat' },
      { label: 'Soy', value: 'soy' },
    ],
    allowMultiple: true,
  },
  {
    id: 'disliked-ingredients',
    question: 'Are there any ingredients you strongly dislike?',
    options: [
      { label: 'None - I eat everything', value: 'none' },
      { label: 'Cilantro', value: 'cilantro' },
      { label: 'Mushrooms', value: 'mushrooms' },
      { label: 'Onions', value: 'onions' },
      { label: 'Bell peppers', value: 'bell-peppers' },
      { label: 'Olives', value: 'olives' },
      { label: 'Eggplant', value: 'eggplant' },
    ],
    allowMultiple: true,
  },
  {
    id: 'health-goals',
    question: 'Do you have specific health or nutrition goals?',
    options: [
      { label: 'Weight loss', value: 'weight-loss' },
      { label: 'Muscle gain', value: 'muscle-gain' },
      { label: 'General health maintenance', value: 'general-health' },
      { label: 'Managing a health condition', value: 'health-condition' },
      { label: 'No specific goals', value: 'none' },
    ],
    allowMultiple: true,
  }
];

// Define proper types
interface QuizAnswers {
  [key: string]: string | string[];
}

export default function DietaryQuiz() {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [loading, setLoading] = useState(false);
  
  // No need to check auth with Supabase anymore
  // We'll hardcode the test user

  const handleAnswer = (questionId: string, value: string | string[]) => {
    setAnswers({
      ...answers,
      [questionId]: value,
    });
  };

  const handleMultipleChoice = (questionId: string, value: string) => {
    const currentValues = answers[questionId] || [];
    
    // Convert string to array if needed
    const valuesArray = Array.isArray(currentValues) 
      ? currentValues 
      : currentValues ? [currentValues] : [];
    
    const updatedValues = valuesArray.includes(value)
      ? valuesArray.filter(v => v !== value)
      : [...valuesArray, value];
    
    handleAnswer(questionId, updatedValues);
  };

  const handleNext = () => {
    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Save preferences and redirect
      savePreferences();
    }
  };

  const savePreferences = async () => {
    setLoading(true);
    
    try {
      // Transform quiz answers to match UserPreferences model
      const dietaryRestrictions = answers.dietary as string[];
      const healthGoals = answers['health-goals'] as string[];
      const allergiesList = answers.allergies as string[];
      const dislikedList = answers['disliked-ingredients'] as string[];
      const preferredCuisinesList = answers['preferred-cuisines'] as string[];
      
      // Filter out 'none' values from arrays
      const filteredAllergies = allergiesList?.filter(allergy => allergy !== 'none') || [];
      const filteredDisliked = dislikedList?.filter(item => item !== 'none') || [];
      const filteredHealthGoals = healthGoals?.filter(goal => goal !== 'none') || [];
      
      const preferences = {
        // Dietary restrictions
        is_vegetarian: dietaryRestrictions?.includes('vegetarian') || false,
        is_vegan: dietaryRestrictions?.includes('vegan') || false,
        is_gluten_free: dietaryRestrictions?.includes('gluten-free') || false,
        is_dairy_free: dietaryRestrictions?.includes('dairy-free') || false,
        is_nut_free: dietaryRestrictions?.includes('nut-free') || false,
        
        // Cooking preferences
        max_cooking_time: parseInt(answers['cooking-time'] as string || '30'),
        cooking_skill_level: answers['skill-level'] as string || 'intermediate',
        
        // Flavor preferences
        spicy_preference: (answers['flavor-preferences'] as string[])?.includes('spicy') ? 8 : 5,
        sweet_preference: (answers['flavor-preferences'] as string[])?.includes('sweet') ? 8 : 5,
        savory_preference: (answers['flavor-preferences'] as string[])?.includes('savory') ? 8 : 5,
        
        // New preferences
        cuisine: answers.cuisine as string || 'Any',
        people_count: parseInt(answers['people-count'] as string || '2'),
        
        // Array preferences
        preferred_cuisines: preferredCuisinesList?.length ? preferredCuisinesList : ['Italian', 'Mexican', 'Asian'],
        diet_goals: filteredHealthGoals,
        allergies: filteredAllergies,
        disliked_ingredients: filteredDisliked
      };
      
      console.log('Saving preferences:', preferences);
      
      // Save preferences using the API endpoint
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ preferences })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.details || 'Failed to save preferences');
      }
      
      // Redirect to results page
      router.push('/preferences/results');
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Failed to save your preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const question = quizQuestions[currentQuestion];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Dietary Preferences Quiz</h1>
        <Link href="/" className="btn-secondary">
          Skip Quiz
        </Link>
      </div>

      <div className="card max-w-2xl mx-auto">
        <div className="text-sm mb-4">
          Question {currentQuestion + 1} of {quizQuestions.length}
        </div>
        
        <h2 className="text-xl font-semibold mb-6">{question.question}</h2>
        
        <div className="space-y-3 mb-8">
          {question.options.map((option) => (
            <div key={option.value} className="flex items-center">
              <input
                type={question.allowMultiple ? "checkbox" : "radio"}
                id={option.value}
                name={question.id}
                value={option.value}
                checked={
                  question.allowMultiple 
                    ? (answers[question.id] as string[] || []).includes(option.value)
                    : answers[question.id] === option.value
                }
                onChange={() => 
                  question.allowMultiple
                    ? handleMultipleChoice(question.id, option.value)
                    : handleAnswer(question.id, option.value)
                }
                className="mr-3"
              />
              <label htmlFor={option.value}>{option.label}</label>
            </div>
          ))}
        </div>
        
        <div className="flex justify-between">
          <button 
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
            className="btn-secondary disabled:opacity-50"
          >
            Previous
          </button>
          <button 
            onClick={handleNext} 
            className="btn-primary"
            disabled={loading}
          >
            {currentQuestion < quizQuestions.length - 1 
              ? 'Next' 
              : loading 
                ? 'Saving...' 
                : 'Finish'}
          </button>
        </div>
      </div>
    </div>
  );
} 