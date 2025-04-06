'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
      { label: 'Nut-Free', value: 'nut-free' },
      { label: 'Keto', value: 'keto' },
      { label: 'Paleo', value: 'paleo' },
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
    id: 'cooking-skill',
    question: 'What is your cooking skill level?',
    options: [
      { label: "Beginner - I'm just learning to cook", value: 'beginner' },
      { label: "Intermediate - I can follow most recipes", value: 'intermediate' },
      { label: "Advanced - I'm comfortable with complex techniques", value: 'advanced' },
    ],
    allowMultiple: false,
  },
  {
    id: 'meal-size',
    question: 'How many people do you typically cook for?',
    options: [
      { label: 'Just myself', value: '1' },
      { label: '2 people', value: '2' },
      { label: '3-4 people', value: '4' },
      { label: '5+ people', value: '5' },
    ],
    allowMultiple: false,
  },
  {
    id: 'cuisine-preference',
    question: 'What cuisines do you prefer?',
    options: [
      { label: 'American', value: 'american' },
      { label: 'Italian', value: 'italian' },
      { label: 'Mexican', value: 'mexican' },
      { label: 'Asian', value: 'asian' },
      { label: 'Mediterranean', value: 'mediterranean' },
      { label: 'Indian', value: 'indian' },
      { label: 'Middle Eastern', value: 'middle-eastern' },
      { label: 'French', value: 'french' },
    ],
    allowMultiple: true,
  },
  {
    id: 'flavor-preference',
    question: 'What flavors do you enjoy?',
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
    id: 'health-goals',
    question: 'Do you have any specific health goals?',
    options: [
      { label: 'Weight loss', value: 'weight-loss' },
      { label: 'Muscle gain', value: 'muscle-gain' },
      { label: 'Improved energy', value: 'energy' },
      { label: 'Better digestion', value: 'digestion' },
      { label: 'Improved overall health', value: 'general-health' },
      { label: 'No specific goals', value: 'none' },
    ],
    allowMultiple: true,
  },
  {
    id: 'allergies',
    question: 'Do you have any food allergies?',
    options: [
      { label: 'No allergies', value: 'none' },
      { label: 'Nuts', value: 'nuts' },
      { label: 'Shellfish', value: 'shellfish' },
      { label: 'Eggs', value: 'eggs' },
      { label: 'Soy', value: 'soy' },
      { label: 'Wheat', value: 'wheat' },
      { label: 'Other (please specify in notes)', value: 'other' },
    ],
    allowMultiple: true,
  },
  {
    id: 'sustainability',
    question: 'How important is sustainability in your food choices?',
    options: [
      { label: 'Very important - I prioritize sustainable options', value: 'high' },
      { label: 'Somewhat important - I consider it when convenient', value: 'medium' },
      { label: 'Not a priority for me right now', value: 'low' },
    ],
    allowMultiple: false,
  },
  {
    id: 'nutrition-focus',
    question: 'Are you focusing on any specific nutritional aspects?',
    options: [
      { label: 'High protein', value: 'high-protein' },
      { label: 'Low carb', value: 'low-carb' },
      { label: 'Low fat', value: 'low-fat' },
      { label: 'High fiber', value: 'high-fiber' },
      { label: 'Balanced macros', value: 'balanced' },
      { label: 'Not focused on nutrition details', value: 'no-focus' },
    ],
    allowMultiple: true,
  },
];

// Define proper types
interface QuizAnswers {
  [key: string]: string | string[];
}

export default function DietaryQuiz() {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    // Validate that there's at least one answer for the current question
    const currentQuestionId = quizQuestions[currentQuestion].id;
    const currentAnswer = answers[currentQuestionId];
    
    if (!currentAnswer || (Array.isArray(currentAnswer) && currentAnswer.length === 0)) {
      setError('Please select at least one option before continuing');
      return;
    }
    
    setError(null);
    
    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Save preferences and redirect
      savePreferences();
    }
  };

  const savePreferences = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Transform quiz answers into the format expected by the UserPreferences model
      const transformedPreferences = {
        // Dietary restrictions
        isVegetarian: (answers.dietary as string[])?.includes('vegetarian') || false,
        isVegan: (answers.dietary as string[])?.includes('vegan') || false,
        isGlutenFree: (answers.dietary as string[])?.includes('gluten-free') || false,
        isDairyFree: (answers.dietary as string[])?.includes('dairy-free') || false,
        isNutFree: (answers.dietary as string[])?.includes('nut-free') || false,
        
        // Cooking preferences
        maxCookingTime: parseInt(answers['cooking-time'] as string || '60'),
        cookingSkillLevel: answers['cooking-skill'] as string || 'intermediate',
        peopleCount: parseInt(answers['meal-size'] as string || '1'),
        
        // Other preferences
        cuisinePreferences: answers['cuisine-preference'] || [],
        flavorPreferences: answers['flavor-preference'] || [],
        healthGoals: answers['health-goals'] || [],
        allergies: answers['allergies'] || [],
        sustainabilityPreference: answers['sustainability'] as string || 'medium',
        nutritionFocus: answers['nutrition-focus'] || [],
        
        // Store the raw quiz answers too for reference
        rawQuizAnswers: answers,
      };
      
      // Send to API endpoint
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transformedPreferences),
      });
      
      if (response.ok) {
        // Redirect to results page instead of profile
        router.push('/preferences/results');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to save preferences');
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
      setError('There was a problem saving your preferences. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const question = quizQuestions[currentQuestion];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Dietary Preferences Quiz</h1>
        <Link href="/preferences" className="btn-secondary">
          Skip Quiz
        </Link>
      </div>

      <div className="card max-w-2xl mx-auto">
        <div className="text-sm mb-4">
          Question {currentQuestion + 1} of {quizQuestions.length}
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div 
              className="bg-green-600 h-2 rounded-full" 
              style={{ width: `${((currentQuestion + 1) / quizQuestions.length) * 100}%` }}
            ></div>
          </div>
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
                    ? Array.isArray(answers[question.id]) && (answers[question.id] as string[]).includes(option.value)
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
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
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
            disabled={isSubmitting}
          >
            {currentQuestion < quizQuestions.length - 1 
              ? 'Next' 
              : isSubmitting 
                ? 'Saving...' 
                : 'Finish'}
          </button>
        </div>
      </div>
    </div>
  );
} 