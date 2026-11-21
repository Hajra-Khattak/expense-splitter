import { Utensils, Plane, Home, Zap, Film, Tag } from 'lucide-react'

export const CATEGORIES = [
  { id: 'food', label: 'Food', icon: Utensils, color: 'text-orange-600 dark:text-orange-300' },
  { id: 'travel', label: 'Travel', icon: Plane, color: 'text-sky-600 dark:text-sky-300' },
  { id: 'rent', label: 'Rent', icon: Home, color: 'text-violet-600 dark:text-violet-300' },
  { id: 'utilities', label: 'Utilities', icon: Zap, color: 'text-amber-600 dark:text-amber-300' },
  { id: 'entertainment', label: 'Entertainment', icon: Film, color: 'text-pink-600 dark:text-pink-300' },
  { id: 'other', label: 'Other', icon: Tag, color: 'text-gray-600 dark:text-green-200' },
]

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id)

export function getCategory(id) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1]
}