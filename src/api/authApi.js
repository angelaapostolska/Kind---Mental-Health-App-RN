import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';
import { env } from '@/config/environments';
import { setUserName } from '@/store/commonSlices/appSlice';
import { setUserId, setUserEmail } from '@/store/commonSlices/userSlice';

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: env.base_api_url,
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  endpoints: (builder) => ({
    login: builder.mutation({
      query: ({ email, password }) => ({
        url: 'api/login',
        method: 'POST',
        body: { email, password },
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          await SecureStore.setItemAsync('access_token', data.token);
          dispatch(setUserName(data.name));
          dispatch(setUserEmail(data.email));
          dispatch(setUserId(data.id));
        } catch (err) {
          console.warn('Login failed', err);
        }
      },
    }),
    register: builder.mutation({
      query: ({ name, email, password }) => ({
        url: 'api/register',
        method: 'POST',
        body: { name, email, password },
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          await SecureStore.setItemAsync('access_token', data.token);
          dispatch(setUserName(data.name));
          dispatch(setUserEmail(data.email));
          dispatch(setUserId(data.id));
        } catch (err) {
          console.warn('Register failed', err);
        }
      },
    }),
  }),
});

export const { useLoginMutation, useRegisterMutation } = authApi;
