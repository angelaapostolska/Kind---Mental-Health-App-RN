// src/constants/animals.js
//
// Shared source of truth for the onboarding companion animals — picked once
// during onboarding (OnboardingNavigator) and referenced again wherever the
// user's chosen companion shows up later (e.g. the Home header avatar).

export const ANIMALS = [
  { id: 'cat', name: 'Mochi', emoji: '🐱', desc: 'Calm & curious', tint: 'lavender' },
  { id: 'dog', name: 'Buddy', emoji: '🐶', desc: 'Loyal & cheerful', tint: 'mint' },
  { id: 'bunny', name: 'Luna', emoji: '🐰', desc: 'Gentle & kind', tint: 'pink' },
];

export const getAnimal = (id) => ANIMALS.find((a) => a.id === id) || ANIMALS[0];

export default ANIMALS;
