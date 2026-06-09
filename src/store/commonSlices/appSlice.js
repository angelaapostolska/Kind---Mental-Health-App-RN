import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  hideOnboarding: false,
  userName: '',
  selectedAnimal: 'cat',
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
  },
});

export const { setHideOnboarding, setUserName, setSelectedAnimal } = appSlice.actions;

export default appSlice.reducer;
