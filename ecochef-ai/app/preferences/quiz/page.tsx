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
  // Add more questions as needed
];

// Define proper types
interface QuizAnswers {
  [key: string]: string | string[];
}

export default function DietaryQuiz() {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({});

  const handleAnswer = (questionId: string, value: string | string[]) => {
    setAnswers({
      ...answers,
      [questionId]: value,
    });
  };

  const handleMultipleChoice = (questionId: string, value: string) => {
    const currentValues = answers[questionId] || [];
    const updatedValues = currentValues.includes(value)
      ? currentValues.filter((v: string) => v !== value)
      : [...currentValues, value];
    
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
    try {
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(answers),
      });
      
      if (response.ok) {
        router.push('/preferences/results');
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
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
                    ? (answers[question.id] || []).includes(option.value)
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
          <button onClick={handleNext} className="btn-primary">
            {currentQuestion < quizQuestions.length - 1 ? 'Next' : 'Finish'}
          </button>
        </div>
      </div>
    </div>
  );
} 