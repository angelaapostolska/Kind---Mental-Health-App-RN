import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';
import { env } from '@/config/environments';

// Base fetch query
const rawBaseQuery = fetchBaseQuery({
  baseUrl: env.base_api_url,
});

// Async wrapper to attach Bearer token
const baseQueryWithBearer = async (args, api, extraOptions) => {
  const accessToken = await SecureStore.getItemAsync('access_token');

  if (accessToken) {
    if (typeof args === 'string') {
      args = { url: args, headers: { Authorization: `Bearer ${accessToken}` } };
    } else if (args.headers) {
      args.headers['Authorization'] = `Bearer ${accessToken}`;
    } else {
      args.headers = { Authorization: `Bearer ${accessToken}` };
    }
  }

  return rawBaseQuery(args, api, extraOptions);
};

// Create the main API
export const cdtApi = createApi({
  reducerPath: 'cdtApi',
  baseQuery: baseQueryWithBearer,
  tagTypes: ['User', 'MoodEntry', 'JournalEntry', 'Emotion', 'MoodFactor', 'Habit', 'HabitLog'],
  endpoints: (builder) => ({
    // --- User ---
    getUserByEmail: builder.query({
      query: (email) => `api/users/email/${email}`,
      providesTags: ['User'],
    }),
    updateUser: builder.mutation({
      query: ({ id, data }) => ({
        url: `api/users/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    // --- Mood ---
    getMoodEntries: builder.query({
      query: (userId) => `api/mood-entries/user/${userId}`,
      providesTags: ['MoodEntry'],
    }),
    getMoodEntriesByMonth: builder.query({
      query: ({ userId, year, month }) => `api/mood-entries/user/${userId}/calendar/${year}/${month}`,
      providesTags: ['MoodEntry'],
    }),
    createMoodEntry: builder.mutation({
      query: (data) => ({
        url: 'api/mood-entries',
        method: 'POST',
        body: data, // { date, moodValue, note, user: { id }, selectedEmotions, selectedFactors }
      }),
      invalidatesTags: ['MoodEntry'],
    }),
    deleteMoodEntry: builder.mutation({
      query: (id) => ({
        url: `api/mood-entries/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['MoodEntry'],
    }),

    // --- Journal ---
    getJournalEntries: builder.query({
      query: (userId) => `api/journal-entries/user/${userId}`,
      providesTags: ['JournalEntry'],
    }),
    getJournalEntry: builder.query({
      query: (id) => `api/journal-entries/${id}`,
      providesTags: ['JournalEntry'],
    }),
    createJournalEntry: builder.mutation({
      query: (data) => ({
        url: 'api/journal-entries',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['JournalEntry'],
    }),
    updateJournalEntry: builder.mutation({
      query: ({ id, data }) => ({
        url: `api/journal-entries/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['JournalEntry'],
    }),
    deleteJournalEntry: builder.mutation({
      query: (id) => ({
        url: `api/journal-entries/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['JournalEntry'],
    }),

    // --- Emotions (feeling tags) ---
    getEmotions: builder.query({
      query: () => 'api/emotions',
      providesTags: ['Emotion'],
    }),

    // --- Mood Factors (influencing factors) ---
    getMoodFactors: builder.query({
      query: () => 'api/mood-factors',
      providesTags: ['MoodFactor'],
    }),
    // --- Habits ---
    getHabits: builder.query({
      query: (userId) => `api/habits/user/${userId}`,
      providesTags: ['Habit'],
    }),
    createHabit: builder.mutation({
      query: ({ userId, data }) => ({
        url: `api/habits/user/${userId}`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Habit'],
    }),
    getHabitToday: builder.query({
      query: (habitId) => `api/habits/${habitId}/logs/today`,
      providesTags: (result, error, habitId) => [{ type: 'HabitLog', id: habitId }],
    }),
    toggleHabitToday: builder.mutation({
      query: ({ habitId, completed }) => ({
        url: `api/habits/${habitId}/logs/today?completed=${completed}`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, { habitId }) => [{ type: 'HabitLog', id: habitId }],
    }),
  }),
});

export const {
  useGetUserByEmailQuery,
  useUpdateUserMutation,
  useGetMoodEntriesQuery,
  useGetMoodEntriesByMonthQuery,
  useCreateMoodEntryMutation,
  useDeleteMoodEntryMutation,
  useGetJournalEntriesQuery,
  useGetJournalEntryQuery,
  useCreateJournalEntryMutation,
  useUpdateJournalEntryMutation,
  useDeleteJournalEntryMutation,
  useGetEmotionsQuery,
  useGetMoodFactorsQuery,
  useGetHabitsQuery,
  useCreateHabitMutation,
  useGetHabitTodayQuery,
  useToggleHabitTodayMutation,
} = cdtApi;