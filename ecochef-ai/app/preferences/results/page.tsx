'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface UserPreferences {
  id: string;
  userId: string;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isDairyFree: boolean;
  isNutFree: boolean;
  maxCookingTime: number | null;
  cookingSkillLevel: string | null;
  // Add other fields as needed
}

export default function QuizResults() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const response = await fetch('/api/preferences');
        if (response.ok) {
          const data = await response.json();
          setPreferences(data.preferences);
          
          // Get AI suggestions based on preferences
          getAiSuggestions(data.preferences);
        }
      } catch (error) {
        console.error('Error fetching preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, []);

  const getAiSuggestions = async (preferences: UserPreferences) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `