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
    getMoodEntries: builder.query({
      query: () => 'api/mood',
      providesTags: ['MoodEntry'],
    }),
    createMoodEntry: builder.mutation({
      query: (data) => ({
        url: 'api/mood',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['MoodEntry'],
    }),
    deleteMoodEntry: builder.mutation({
      query: (id) => ({
        url: `api/mood/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['MoodEntry'],
    }),

    // --- Journal ---
    getJournalEntries: builder.query({
      query: () => 'api/journal',
      providesTags: ['JournalEntry'],
    }),
    getJournalEntry: builder.query({
      query: (id) => `api/journal/${id}`,
      providesTags: ['JournalEntry'],
    }),
    createJournalEntry: builder.mutation({
      query: (data) => ({
        url: 'api/journal',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['JournalEntry'],
    }),
    updateJournalEntry: builder.mutation({
      query: ({ id, data }) => ({
        url: `api/journal/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['JournalEntry'],
    }),
    deleteJournalEntry: builder.mutation({
      query: (id) => ({
        url: `api/journal/${id}`,
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
