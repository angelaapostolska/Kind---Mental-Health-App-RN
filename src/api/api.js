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
  tagTypes: ['User', 'MoodEntry', 'JournalEntry', 'Resource'],
  endpoints: (builder) => ({
    // --- User ---
    getUserInfo: builder.query({
      query: () => 'api/account/userinfo',
      providesTags: ['User'],
    }),
    updateUser: builder.mutation({
      query: ({ id, data }) => ({
        url: `api/account/update/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    // --- Mood ---
    // TODO: replace hardcoded user id 1 once auth is in
    getMoodEntries: builder.query({
      query: () => 'api/mood-entries/user/1',
      providesTags: ['MoodEntry'],
    }),
    createMoodEntry: builder.mutation({
      query: (data) => ({
        url: 'api/mood-entries',
        method: 'POST',
        body: {
          // CHANGED: was 'body: data' — BE requires these exact fields + a user id
          date: data.date, // ADDED: "YYYY-MM-DD", required by BE (nullable=false)
          moodValue: data.moodValue, // ADDED: integer 1-10, required (BE auto-derives moodCategory from it)
          note: data.note || '', // ADDED: optional note
          user: { id: 1 }, // ADDED: hardcoded test user — BE rejects entry if user missing/not found
        },
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
    // TODO: replace hardcoded user id 1 once auth is done
    getJournalEntries: builder.query({
      query: () => 'api/journal-entries/user/1',
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
        body: {
          // CHANGED: was 'body: data' — BE requires these fields + user id
          createdAt: data.createdAt, // ADDED: "YYYY-MM-DD", required (nullable=false)
          title: data.title || '', // ADDED: optional title
          content: data.content, // ADDED: required (nullable=false)
          type: data.type || 'BLANK', // ADDED: EntryType enum — 'BLANK' or 'PROMPT_BASED'
          user: { id: 1 }, // ADDED: hardcoded test user
        },
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

    // --- Resources ---
    getResources: builder.query({
      query: () => 'api/resources',
      providesTags: ['Resource'],
    }),
    getResource: builder.query({
      query: (id) => `api/resources/${id}`,
      providesTags: ['Resource'],
    }),
  }),
});

export const {
  useGetUserInfoQuery,
  useUpdateUserMutation,
  useGetMoodEntriesQuery,
  useCreateMoodEntryMutation,
  useDeleteMoodEntryMutation,
  useGetJournalEntriesQuery,
  useGetJournalEntryQuery,
  useCreateJournalEntryMutation,
  useUpdateJournalEntryMutation,
  useDeleteJournalEntryMutation,
  useGetResourcesQuery,
  useGetResourceQuery,
} = cdtApi;
