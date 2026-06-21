import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isSignedIn: false,
  userId: null,
  userEmail: '',
  userInfo: {
    emailVerified: undefined,
  },
};

const userSlice = createSlice({
  name: 'userSlice',
  initialState,
  reducers: {
    setSignedIn: (state, action) => ({
      ...state,
      isSignedIn: action.payload,
    }),
    setUserId: (state, action) => ({
      ...state,
      userId: action.payload,
    }),
    setUserEmail: (state, action) => ({
      ...state,
      userEmail: action.payload,
    }),
    setUserInfo: (state, action) => ({
      ...state,
      userInfo: {
        ...state.userInfo,
        ...action.payload,
      },
    }),
  },
});

export const { setSignedIn, setUserId, setUserEmail, setUserInfo } = userSlice.actions;

export default userSlice.reducer;