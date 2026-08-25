import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  hideOnboarding: false,
  userName: '',
  selectedAnimal: 'cat',
  // Session-only flag: true for the run in which onboarding was just
  // completed, so the auth stack can open on account creation instead of
  // login. Consumed and reset right after the auth stack reads it.
  onboardingJustCompleted: false,
};

const appSlice = createSlice({
  name: 'appSlice',
  initialState,
  reducers: {
    setHideOnboarding: (state, action) => {
      state.hideOnboarding = action.payload;
    },
    setUserName: (state, action) => {
      state.userName = action.payload;
    },
    setSelectedAnimal: (state, action) => {
      state.selectedAnimal = action.payload;
    },
    setOnboardingJustCompleted: (state, action) => {
      state.onboardingJustCompleted = action.payload;
    },
  },
});

export const { setHideOnboarding, setUserName, setSelectedAnimal, setOnboardingJustCompleted } = appSlice.actions;

export default appSlice.reducer;
