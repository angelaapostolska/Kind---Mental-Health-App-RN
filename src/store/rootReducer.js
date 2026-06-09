import { combineReducers } from '@reduxjs/toolkit';
import { cdtApi } from '@/api/api';
import { authApi } from '@/api/authApi';
import appSlice from './commonSlices/appSlice';
import userSlice from './commonSlices/userSlice';

const rootReducer = combineReducers({
  [cdtApi.reducerPath]: cdtApi.reducer,
  [authApi.reducerPath]: authApi.reducer,
  userState: userSlice,
  appState: appSlice,
});

export default rootReducer;
