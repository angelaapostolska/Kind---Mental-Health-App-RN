# Kind — Mental Health App (React Native)

A React Native / Expo mental wellness companion app. This project is a **full refactor** of the Lovable web app into React Native, following the architecture of the `Kind---Front-end` repository.

---

## Architecture

Mirrors the `Kind---Front-end` repo structure exactly:

```
src/
├── App.jsx                        # Root entry — Redux Provider + PersistGate + Navigation + Toast
├── api/
│   ├── api.js                     # RTK Query main API (mood, journal, resources, user endpoints)
│   └── authApi.js                 # RTK Query auth API (login, register)
├── assets/
│   └── images/                    # Replace placeholders with real PNGs
│       ├── icon.png
│       ├── splash_logo.png
│       ├── onboarding/
│       ├── login/
│       └── social/
├── components/                    # Shared UI components
│   ├── index.js                   # Barrel export
│   ├── ThemeButton.jsx
│   ├── ThemeInput.jsx
│   ├── ThemePasswordInput.jsx
│   ├── ScreenTitle.jsx
│   ├── HeaderBackButton.jsx
│   └── MoodDot.jsx
├── config/
│   ├── NavigationScreens.js       # Screen name constants
│   ├── environments.js            # API base URLs per environment
│   ├── Images.js                  # Image asset references
│   └── themedToast.jsx            # Custom toast renderer
├── constants/
│   └── theme/
│       ├── index.js               # Re-exports { theme }
│       ├── palette.js             # Color tokens
│       ├── spacing.js             # Spacing scale
│       └── typography.js          # Font sizes, weights, line heights
├── navigation/
│   ├── index.jsx                  # Root navigator — onboarding / auth / main gate
│   ├── OnboardingNavigator.jsx    # 3-step onboarding (welcome → animal → name)
│   ├── AuthStackNavigator.jsx     # Login / Signup stack
│   ├── MainStackNavigator.jsx     # Wraps TabBar
│   └── TabBar.jsx                 # Bottom tab navigator (5 tabs)
├── screens/
│   ├── Login.jsx                  # Auth: email + password login
│   └── Signup.jsx                 # Auth: name + email + password registration
├── store/
│   ├── store.js                   # Redux store + persistor + typed hooks
│   ├── rootReducer.js             # Combined reducer
│   └── commonSlices/
│       ├── appSlice.js            # hideOnboarding, userName, selectedAnimal
│       └── userSlice.js           # isSignedIn, userEmail, userInfo
├── tabs/                          # Bottom-tab screen components
│   ├── Home.jsx                   # Affirmation, mood slider, week review, habits, meditation
│   ├── Mood.jsx                   # 3-step mood tracker + calendar + bar chart
│   ├── Journal.jsx                # Prompted + free journaling with entry history
│   ├── Resources.jsx              # Animated breathing exercises (Box, 4-7-8, Calm)
│   └── Profile.jsx                # Stats, settings, sign-out
└── utils/
    └── index.js                   # Toast helpers, mood helpers, date utils, constants
```

---

## Tech Stack

| Layer | Library |
|---|---|
| Framework | React Native 0.79 + Expo 53 |
| Navigation | React Navigation 7 (Native Stack + Bottom Tabs) |
| State | Redux Toolkit + Redux Persist |
| API | RTK Query with Bearer token via expo-secure-store |
| Icons | @expo/vector-icons (MaterialIcons + MaterialCommunityIcons) |
| Toasts | react-native-toast-message |
| Linting | ESLint (expo config) + Prettier |
| Testing | Jest + jest-expo |

---

## Features Ported from Lovable Web App

### Onboarding
- 3-step flow: welcome splash → animal companion picker → name entry
- State saved to Redux Persist (survives app restarts)

### Home Tab
- Daily affirmation card with gradient background
- Interactive mood emoji picker (5 levels, persisted)
- Week-in-review bar chart with colour-coded mood history
- Habit tracker with daily completion, add/toggle habits modal
- Meditation launcher (Sound+Timer or Guided modes)

### Mood Tab
- 3-step mood logging: mood level → feeling tag → influencing factor
- Monthly calendar heatmap (colour-coded by mood level)
- Mood pattern bar chart (30-day overview)

### Journal Tab
- 3 daily AI-style writing prompts (randomised)
- Free-write mode
- Mood picker per entry
- Entry history with mood dot indicators

### Breathe Tab (Resources)
- 3 breathing exercises: Box, 4-7-8, Calm
- Animated pulsing circle (scale transitions per phase)
- Live countdown per phase + cycle counter
- Tips card

### Profile Tab
- User stats (days active, entries, streak)
- Weekly activity summary
- Settings list (notifications, appearance, sound, privacy)
- Sign-out with confirmation alert

### Auth Flow
- Login screen (email + password → RTK Query → SecureStore tokens)
- Signup screen (name + email + password)

---

## Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo`
- iOS Simulator (Xcode) or Android Emulator, or Expo Go app

### Install

```bash
yarn install
# or
npm install
```

### Run

```bash
# Start dev server
yarn start

# iOS
yarn ios

# Android
yarn android
```

### Environment

The app reads the backend URL from `src/config/environments.js` → `local.base_api_url`. It defaults to `http://localhost:3000/`.

- **Emulator / web:** `localhost:3000` works as-is (Android emulator: use `http://10.0.2.2:3000/`).
- **Physical phone (Expo Go):** `localhost` won't reach your laptop. Set `base_api_url` to your laptop's LAN IP — find it with `ipconfig` (look under **Wireless LAN adapter Wi-Fi** → **IPv4 Address**), e.g.:
```js
  base_api_url: 'http://192.168.1.42:3000/',  // your IP, keep :3000 and trailing slash
```
Phone and laptop must be on the same network. If it won't connect, use a laptop **Mobile Hotspot** (laptop IP usually `192.168.137.1`), set the network to **Private**, and allow inbound TCP 3000 in the firewall.

**Don't commit your own IP** — leave `localhost` as the committed default and set your IP locally only.

After changing it, reload the app (`r` in Metro, or shake → Reload).

### Assets

Replace the placeholder 1×1 PNG files in `src/assets/images/` with real artwork:

| File | Used for |
|---|---|
| `icon.png` | App icon (1024×1024) |
| `splash_logo.png` | Splash screen logo |
| `onboarding/onboarding_home.png` | Onboarding slide 1 |
| `login/login_logo.png` | Login screen logo |
| `social/apple_logo.png` | Apple sign-in button |
| `social/google_logo.png` | Google sign-in button |

---

## Linting

```bash
yarn lint
```

## Testing

```bash
yarn test
```

---

## Design Tokens

All colours, spacing, and typography live in `src/constants/theme/`. The palette uses a purple-forward brand identity (`#6C5CE7`) with a full semantic colour system for text, surfaces, borders, and icons.

Mood levels use a consistent 5-colour scale:
1. Very Pleasant → purple `#9b72d4`
2. Pleasant → blue `#5ba8e8`
3. Neutral → green `#5bc47e`
4. Unpleasant → yellow `#f5c842`
5. Very Unpleasant → orange `#f5873a`
