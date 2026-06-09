import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isSignedIn: false,
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
    setUserInfo: (state, action) => ({
      ...state,
      userInfo: {
        ...state.userInfo,
        ...action.payload,
      },
    }),
  },
});

export const { setSignedIn, setUserInfo } = userSlice.actions;

export default userSlice.reducer;
