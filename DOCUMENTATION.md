# Kind — Project Documentation

A full-stack mental wellness companion app: a React Native / Expo mobile client backed by a Spring Boot + PostgreSQL REST API, with AI-powered guided meditations (Azure Speech) and AI-generated mood insights (OpenAI).

**Repositories**
| Repo | Role |
|---|---|
| `angelaapostolska/Kind---Mental-Health-App-RN` | Frontend — React Native / Expo mobile app |
| `madz-e/Kind---Back-End` | Backend — Spring Boot REST API |

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Authentication](#3-authentication)
4. [Navigation](#4-navigation)
5. [Screens & Functionalities](#5-screens--functionalities)
6. [State Management](#6-state-management)
7. [Data Handling & Persistence](#7-data-handling--persistence)
8. [Custom UI Elements](#8-custom-ui-elements)
9. [Web Services](#9-web-services)
10. [Innovation Aspect — AI-Powered Features](#10-innovation-aspect--ai-powered-features)
11. [Requirements Coverage Summary](#11-requirements-coverage-summary)
12. [Setup & Running the Project](#12-setup--running-the-project)

---

## 1. Project Overview

### 1.1 Introduction & Purpose

**Kind** is a mobile mental-wellness companion. It lets a user track their mood, keep a reflective journal, build small daily habits, run guided breathing/meditation exercises, and receive a personalised, AI-generated daily insight about how they've been doing emotionally. The project pairs a native mobile client with a REST backend that owns all persistence, authentication, and the AI/rules pipeline behind the "insight" feature.

The frontend is explicitly a **React Native port of an earlier Lovable-generated web app** (`Kind---Front-end`), rebuilt screen-for-screen and folder-for-folder for a native mobile experience.

### 1.2 Team Members & Contributions

| Member | Area |
|---|---|
| Angela Apostolska (`angela.apostolska@gmail.com`) | Frontend (React Native / Expo app) — screens, navigation, state, UI system, Azure TTS integration |
| madz-e | Backend (Spring Boot API) — data model, auth, REST endpoints, AI insight pipeline |

> Both repositories currently show a single committing identity in their shallow git history at the time this document was generated — update this table with each teammate's actual contribution areas for submission.

### 1.3 Project Architecture Summary (Frontend + Backend split)

```
┌─────────────────────────────┐        HTTPS / JSON         ┌──────────────────────────────┐
│   Kind---Mental-Health-App-RN│ ───────────────────────────▶│      Kind---Back-End         │
│   React Native + Expo        │ ◀─────────────────────────── │      Spring Boot (Java 21)   │
│   Redux Toolkit + RTK Query  │        REST (/api/**)        │      Spring Security + JWT   │
└──────────────┬───────────────┘                              └───────────────┬──────────────┘
               │                                                               │
               │ direct REST call (bypasses backend)                          │ JPA / Hibernate
               ▼                                                               ▼
   Microsoft Azure Speech (TTS)                                        PostgreSQL (`kind_db`)
   — guided meditation audio                                                    │
                                                                                 ▼
                                                                     OpenAI Chat Completions API
                                                                     — daily mood insight generation
```

- The **frontend** owns all UI, local (per-device) session storage, and calls the backend for every persisted resource (users, mood entries, journal entries, habits, emotions/factors, insights, breathing sessions).
- The **backend** owns the PostgreSQL database, JWT-based auth, business rules, and orchestrates the AI insight pipeline (rule-based pre-check → OpenAI call → fallback).
- **Azure Speech** is called **directly from the mobile client** (not proxied through the backend) to synthesize guided-meditation narration audio, keeping the OpenAI/Azure integrations split cleanly between the two "AI features" (see §10).

---

## 2. Technology Stack

### 2.1 Frontend — React Native & Expo

| Concern | Choice |
|---|---|
| Framework | React Native `0.81` on Expo SDK `54`, React `19.1` |
| Navigation | React Navigation 7 (`@react-navigation/native-stack`, `@react-navigation/bottom-tabs`) |
| State | Redux Toolkit + Redux Persist (persisted to `AsyncStorage`) |
| Data fetching | RTK Query (`createApi`) for all backend calls |
| Secure storage | `expo-secure-store` for the JWT access token |
| Audio | `expo-av` (guided meditation & ambient sound playback) |
| Icons | `@expo/vector-icons` (MaterialIcons + MaterialCommunityIcons) |
| Feedback | `react-native-toast-message` (themed toast wrapper) |
| Gestures | `react-native-gesture-handler` (swipe-to-delete on entries) |
| Animation | `react-native-reanimated` + the RN `Animated` API |
| Linting/formatting | ESLint (`eslint-config-expo`) + Prettier |
| Testing | Jest + `jest-expo` + `@testing-library/react-native` |

### 2.2 Backend — Java / Spring Boot

| Concern | Choice |
|---|---|
| Language / runtime | Java 21 |
| Framework | Spring Boot `3.3.2` (Spring Web, Spring Data JPA, Spring Security, Bean Validation) |
| Build tool | Maven (via the `mvnw` wrapper) |
| Auth | Spring Security + JJWT (`io.jsonwebtoken`, `0.12.3`) — stateless JWT bearer auth |
| Password hashing | `BCryptPasswordEncoder` |
| AI client | Plain `RestTemplate` call to the OpenAI Chat Completions API |
| Object mapping | Jackson (`spring-boot-starter-json`) |
| Dev convenience | Spring Boot DevTools, Lombok |

### 2.3 Database & Data Persistence

- **PostgreSQL** (database name `kind_db`, default port `5432`) is the system of record, accessed through **Spring Data JPA / Hibernate**.
- `spring.jpa.hibernate.ddl-auto=update` — the schema (tables for users, mood entries, journal entries/prompts, habits + daily logs, emotions, mood factors, affirmations, reminders, calming sounds, breathing sessions, mindfulness exercises) is created/updated automatically from the JPA entities on startup; there are no separate SQL migrations.
- Connection pooling via HikariCP (Spring Boot default), tuned in `application-prod.properties`.
- On the client, persistent (cross-session) state lives in two places with very different lifetimes — see §7.2.

### 2.4 Microsoft Azure (Speech + AI Services)

- **Azure Cognitive Services — Speech (Text-to-Speech)**, called directly from the React Native client via the REST TTS endpoint (`https://<region>.tts.speech.microsoft.com/cognitiveservices/v1`), using the **free F0 tier** (500,000 characters/month).
- Voice: `en-US-CoraMultilingualNeural`, driven via **SSML** with a slowed speech rate (`-12%`) and inter-paragraph pauses (`1700ms`) tuned for a meditative delivery.
- Credentials (`AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`) are supplied through environment variables / `app.config.js`'s `extra` block — never hardcoded (see §12.3).

### 2.5 Third-party Libraries & Dependencies

**Frontend (selected):** `@reduxjs/toolkit`, `redux-persist`, `react-redux`, `expo-linear-gradient`, `expo-notifications`, `expo-secure-store`, `expo-av`, `expo-router` (installed, navigation currently driven by React Navigation rather than file-based routing), `prop-types`.

**Backend (selected):** `spring-boot-starter-web/security/data-jpa/validation`, `org.postgresql:postgresql`, `io.jsonwebtoken:jjwt-*`, `org.projectlombok:lombok`, `com.h2database:h2` (test scope, for in-memory test runs).

---

## 3. Authentication (10%)

### 3.1 Auth Flow Overview

1. **Sign-up / Sign-in** — the Onboarding flow collects a display name and a companion animal, then routes into the Auth stack (`Signup` or `Login`). `Signup`/`Login` submit to the backend's `POST /api/register` / `POST /api/login`.
2. The backend validates credentials with Spring Security's `AuthenticationManager` (`DaoAuthenticationProvider` + `BCryptPasswordEncoder`), issues a **JWT**, and returns `{ token, id, name, email, animal }`.
3. The client stores the token in `expo-secure-store` (`access_token`) and mirrors `userId`/`userEmail`/`selectedAnimal` into Redux (`userSlice`, `appSlice`).
4. `Navigation` (`src/navigation/index.jsx`) reactively gates the whole app on `userState.isSignedIn` (post-onboarding): signed-in users see `MainStackNavigator` (the tab bar), signed-out users see `AuthStackNavigator`.
5. Every subsequent API call attaches `Authorization: Bearer <token>` (RTK Query base query wrapper in `src/api/api.js`). On a `401`, the client clears the stored token and resets Redux auth state, which drops the user back to the Auth stack automatically.

### 3.2 Implementation Details (tokens, session handling, secure storage)

- **Token format:** HMAC-SHA-signed JWT (`io.jsonwebtoken`), subject = user email, `iat`/`exp` claims. Secret and expiry are externalised (`jwt.secret`, `jwt.expiration=86400000` → 24h) in `application-prod.properties`.
- **Stateless sessions:** `SessionCreationPolicy.STATELESS` — the backend keeps no server-side session; every request is authenticated independently by `JwtAuthFilter` (a `OncePerRequestFilter`) which parses the bearer token, loads the `UserDetails` by email, and populates the `SecurityContext`.
- **Public endpoints:** only `/api/login`, `/api/register`, and `/error` are permitted without a token (`SecurityConfig`); every other route requires `.anyRequest().authenticated()`.
- **Unauthorized responses:** a custom `authenticationEntryPoint` returns a JSON `{ "error": "..." }` body with `401` instead of Spring's default HTML error page.
- **CORS:** wide-open (`allowedOriginPatterns: *`, all methods, all headers, `allowCredentials=false`) — appropriate for a token-in-header mobile client, not cookie-based.
- **Client-side secure storage:** the access token is kept in `expo-secure-store` (backed by iOS Keychain / Android Keystore), **not** `AsyncStorage` — this is deliberately outside the Redux-Persist blacklist boundary described in §7.2, so the token survives across app restarts without living in plain persisted JSON.
- **Password storage:** hashed with BCrypt server-side; plaintext is never persisted.
- **Known scaffolding note (from the backend README):** earlier in the project several endpoints were open with a hardcoded `user.id = 1` on the frontend while auth was being built; JWT auth (as described above) has since replaced that scaffolding for the endpoints that require an authenticated `User` principal (e.g. `/api/insights/today`).

---

## 4. Navigation (10%)

### 4.1 Navigation Architecture

`src/navigation/index.jsx` is a **three-way root switch** driven by Redux state, wrapped in a single `NavigationContainer`:

```
hideOnboarding === false  →  OnboardingNavigator   (3-step local-state wizard, not a stack navigator)
hideOnboarding === true & isSignedIn === false → AuthStackNavigator  (native stack: Login ⇄ Signup)
hideOnboarding === true & isSignedIn === true  → MainStackNavigator  (native stack wrapping the tab bar)
```

This mirrors a classic "gate" pattern: onboarding is shown once (persisted via Redux Persist), then the app forever branches between the auth stack and the main app based on sign-in state — no manual `navigation.reset()` calls are needed because the whole tree remounts on the relevant state flip.

### 4.2 Tab Navigator — 5 Bottom Tabs

`TabBar.jsx` builds a **custom-rendered** `createBottomTabNavigator` (a fully custom `tabBar` render prop, not the stock tab bar UI) with five tabs:

| Route name | Label | Icon (outline / filled) | Screen |
|---|---|---|---|
| `Home` | Home | `home-variant-outline` / `home-variant` | `tabs/Home.jsx` |
| `Mood` | Mood | `emoticon-happy-outline` / `emoticon-happy` | `tabs/Mood.jsx` |
| `Journal` | Journal | `book-open-page-variant-outline` / `book-open-page-variant` | `tabs/Journal.jsx` |
| `Resources` | **Breathe** (display label differs from route name) | `weather-windy` (same icon both states) | `tabs/Resources.jsx` |
| `Profile` | Profile | `account-circle-outline` / `account-circle` | `tabs/Profile.jsx` |

The custom bar renders a floating glass pill (gradient fill, safe-area aware) with an animated "active" pill indicator behind the focused tab's icon/label.

### 4.3 Stack & Modal/Action Sheet Navigation

- **`AuthStackNavigator`** (native stack, headers hidden): `Login` ⇄ `Signup`. The initial route is decided dynamically — if onboarding was *just* completed this session, it opens on `Signup` (frictionless "create your account now" flow); otherwise it opens on `Login`.
- **`MainStackNavigator`** (native stack, headers hidden): a thin wrapper whose only route is the `TabBar` (`AppTabs`) — additional detail/modal screens are named as constants in `NavigationScreens.js` (`MoodDetail`, `JournalDetail`, `JournalCreate`, `ResourceDetail`, `Settings`) for future stack expansion, though in the current implementation most "detail" interactions are handled as **in-screen modals and action sheets** rather than pushed stack routes (see §5.7).
- **Modals/action sheets** are implemented with React Native's `Modal` component and a custom `SwipeDismissSheet` (swipe-to-dismiss bottom sheet), used for: habit creation, meditation mode selection, the guided-meditation full-screen session/completion overlay, and mood/journal multi-step entry flows.

---

## 5. Screens & Functionalities (10%)

### 5.1 Screen Inventory (all screens enumerated)

| Screen | Stack | Purpose |
|---|---|---|
| Onboarding (3 steps) | `OnboardingNavigator` | Welcome → companion animal picker → name entry |
| `Login` | Auth | Email + password sign-in |
| `Signup` | Auth | Name + email + password + companion animal registration |
| `Home` | Tab 1 | Daily dashboard |
| `Mood` | Tab 2 | Mood logging, calendar heatmap, insight card |
| `Journal` | Tab 3 | Prompted/free journaling, CBT thought records |
| `Resources` ("Breathe") | Tab 4 | Guided breathing exercises |
| `Profile` | Tab 5 | Stats, settings, sign-out |
| Habit modal | Home overlay | Add/edit a habit |
| Meditation mode modal | Home overlay | Choose Sound+Timer vs Guided meditation |
| Meditation session (timed) | Home overlay | Ambient-sound + countdown session |
| Guided meditation session | Home overlay (full-screen `Modal`) | Azure-TTS narrated session + completion screen |
| Journal entry detail / Thought Record detail | Journal overlay | View a structured CBT thought record |

### 5.2 Tab 1 — Home

The daily dashboard: a personalised greeting (time-of-day aware) with the user's companion avatar, a daily affirmation card, an interactive 5-level mood slider that posts a mood entry for "today," a week-in-review strip, the habit tracker (add/toggle/delete, backed by per-habit daily logs), and the meditation launcher, which opens the mode-selection modal (Sound+Timer or AI-Guided).

### 5.3 Tab 2 — Mood

A 3-step guided mood-logging flow (mood level → feeling/emotion tag → contributing factor), plus a monthly calendar heatmap colour-coded by mood level, a 30-day mood pattern bar chart, swipe-to-delete on past entries, and the `MoodInsightCard` — the surfaced result of the backend's AI insight pipeline (§10.3).

### 5.4 Tab 3 — Journal

Three randomised daily writing prompts plus a free-write mode; entries can optionally be tagged with a mood. Supports the **structured "Thought Record"** CBT format (`ThoughtRecord` / `ThoughtRecordDetail` / `BeforeAfterReveal` components — situation → automatic thought → evidence for/against → balanced thought) alongside plain journal entries, with a swipeable entry history showing a mood-dot indicator per entry.

### 5.5 Tab 4 — Resources ("Breathe")

Three animated breathing exercises — **Box breathing**, **4-7-8 breathing**, and **Calm breathing** — each with a pulsing animated circle synced to inhale/hold/exhale phase timings, a live per-phase countdown, a cycle counter, and a tips card. Completed sessions are posted to the backend as breathing-session records.

### 5.6 Tab 5 — Profile

User stats (days active, total entries, current streak — computed client-side from mood/journal/breathing-session queries), a weekly activity summary, a settings list (notification reminders wired to `expo-notifications`, appearance, sound & haptics, privacy), and sign-out (clears the secure-store token and Redux auth state after a confirmation alert).

### 5.7 Action Sheets, Modals & Secondary Screens per Tab

| Tab | Modal / Action sheet |
|---|---|
| Home | Habit create/edit modal (`HabitModal`), meditation mode picker (`MeditationModal`), timed meditation session (`MeditationSession`), guided meditation full-screen session + completion (`GuidedMeditationSession`) |
| Mood | Multi-step mood entry sheet (level → emotion → factor), delete-confirmation |
| Journal | Prompt picker, free-write vs. Thought Record mode switch, entry detail view, delete-confirmation |
| Resources | Exercise picker → full-screen animated breathing modal |
| Profile | Sign-out confirmation `Alert` |

---

## 6. State Management (15%)

### 6.1 Chosen State Solution

**Redux Toolkit**, split into two concerns:
- Plain slices (`createSlice`) for local UI/session state (`appSlice`, `userSlice`).
- **RTK Query** (`createApi`) for all server state — `cdtApi` (`src/api/api.js`) for the main resource API, and a separate `authApi` (`src/api/authApi.js`) for login/register.

**Redux Persist** wraps the root reducer so app-level and user-session state survives app restarts, backed by `AsyncStorage`.

### 6.2 Global State Structure

```js
rootReducer = {
  [cdtApi.reducerPath]: ...,   // RTK Query cache — mood/journal/habit/insight/etc.
  [authApi.reducerPath]: ...,  // RTK Query cache — login/register
  userState: {                 // userSlice
    isSignedIn, userId, userEmail, userInfo: { emailVerified },
  },
  appState: {                  // appSlice
    hideOnboarding, userName, selectedAnimal, onboardingJustCompleted,
  },
}
```

RTK Query cache tags used for invalidation: `User`, `MoodEntry`, `JournalEntry`, `JournalPrompt`, `Emotion`, `MoodFactor`, `Habit`, `HabitLog`, `Insight`, `BreathingSession` — mutations invalidate the relevant tag(s) so dependent queries auto-refetch (e.g. creating a mood entry invalidates `MoodEntry`, which refreshes the calendar and week-review views).

### 6.3 Local vs Global State Decisions

- **Global (Redux):** anything needed across screens or across restarts — sign-in state, user identity, onboarding progress/companion choice, and every server-backed resource (via RTK Query's cache).
- **Persisted, but deliberately excluded from Redux Persist:** the RTK Query caches (`cdtApi`, `authApi`) are **blacklisted** in `persistConfig` — a stale cached snapshot on cold start would show outdated (or empty) data instead of refetching, so those reducers always start fresh and re-fetch from the network.
- **Local (component `useState`/`useRef`):** anything transient and screen-scoped — modal open/close, multi-step wizard position (onboarding steps, mood-entry steps), animation drivers (`Animated.Value` refs for the breathing/meditation pulse), form input drafts, and timers/intervals for session countdowns.

---

## 7. Data Handling & Persistence (15%)

### 7.1 Data Models

Backend JPA entities (`com.example.model`): `User`, `MoodEntry`, `MoodFactor`, `Emotion`, `JournalEntry`, `JournalPrompt`, `Habit`, `HabitDailyLog`, `Affirmation`, `Reminder`, `CalmingSound`, `MindfulnessExercise`, `BreathingSession`, plus enumerations `MoodCategory`, `EntryType`, `ExerciseType`, `JournalPromptType`, `ReminderType`.

Key relationships:
- `MoodEntry` ↔ `Emotion` / `MoodFactor` (many-to-many "selected emotions/factors" per entry), plus a `date`, a `moodValue` (1–5) and an optional free-text `note`.
- `Habit` → many `HabitDailyLog` (one log per calendar day, `completed: boolean`).
- `JournalEntry` has a `content` field (`TEXT` column) and an `EntryType` (free-write / prompted / thought-record), optionally linked to a `JournalPrompt`.
- All user-owned resources carry a `User` (or `userId`) foreign key; JPA-lazy relationship fields are annotated `@JsonIgnoreProperties({"hibernateLazyInitializer","handler"})` to serialise cleanly to JSON.

### 7.2 Local Storage (`AsyncStorage` / `SecureStore`)

Two clearly separated local stores on the client:

| Store | Contents | Why |
|---|---|---|
| `AsyncStorage` (via Redux Persist) | `appState` (onboarding/companion/name), `userState` (sign-in flag, userId, email) | Ordinary app/session state — fine to persist as plain JSON, restores instantly on relaunch |
| `expo-secure-store` | `access_token` (JWT) | Sensitive credential — kept in the OS keychain/keystore rather than plain-JSON `AsyncStorage`, and deliberately outside the Redux Persist tree |

RTK Query's in-memory cache (`cdtApi`/`authApi`) is explicitly **not** persisted (see §6.3) — it's always network-backed on cold start.

### 7.3 Remote Data — API Communication

- All server communication goes through **RTK Query** `fetchBaseQuery` instances pointed at `env.base_api_url` (per-environment backend URL, `src/config/environments.js`).
- `cdtApi`'s base query (`baseQueryWithBearer`) is a thin async wrapper: it reads the token from `SecureStore`, injects `Authorization: Bearer <token>` on every request, forwards to the raw `fetchBaseQuery`, and on a `401` response proactively logs the client out (clears the token, resets `userState`).
- `authApi` has its own unauthenticated base query (login/register don't have a token yet) and, on a successful response, side-effects into Redux (`onQueryStarted`) to store the token and hydrate `userSlice`/`appSlice`.
- Endpoints cover: users, mood entries (incl. by-month calendar and averages), journal entries + prompts, emotions (+ by category), mood factors, habits + daily logs (with a `transformResponse` normalising Spring's `Optional<HabitDailyLog>` serialisation quirk into a plain `{ completed }` shape), today's AI insight, and breathing sessions.

### 7.4 Mood Log Data Flow end-to-end

1. **Capture** — user steps through the Mood tab's 3-step flow (level → emotion tag → contributing factor) or the Home tab's quick mood slider.
2. **Submit** — `useCreateMoodEntryMutation()` posts `{ userId, date, moodValue, selectedEmotions, selectedFactors, note }` to `POST /api/mood-entries`.
3. **Persist** — `MoodEntryController` → `MoodEntryServiceImpl` saves a `MoodEntry` row (with its `Emotion`/`MoodFactor` associations) to PostgreSQL via `MoodEntryRepository`.
4. **Invalidate & refetch** — the mutation invalidates the `MoodEntry` cache tag; every screen subscribed to mood data (Home's week strip, Mood's calendar/bar chart, Profile's stats) automatically refetches.
5. **Read back for display** — `GET /api/mood-entries/user/{userId}`, `.../calendar/{year}/{month}`, and `.../average` power the calendar heatmap, the 30-day chart, and streak/average calculations respectively.
6. **Feed the AI pipeline** — separately, `InsightContextService` aggregates the last 7/14 days of mood entries (plus habits and the latest journal note) into a `UserInsightContext`, which is what powers the daily insight shown back on the Mood tab (`MoodInsightCard`) — see §10.3 for the full insight pipeline.

---

## 8. Custom UI Elements (5%)

### 8.1 Design System & Theming

All design tokens live under `src/constants/theme/`:
- **`palette.js`** — a purple-forward brand palette (`primary: #6C5CE7`) with a full semantic system: `text.*`, `surface.*` (including `action`, `disabled`, `success`, `warning`, `error`, `inverse`, `brandPrimary/Secondary` variants), and `icon.*`.
- **`spacing.js`** / **`typography.js`** — spacing scale and font size/weight/line-height scale.
- **`index.js`** re-exports everything as a single `theme` object (`theme.colors`, `theme.spacing`, `theme.typography`), imported throughout the app.
- A dedicated **5-level mood colour scale** is used consistently across Home, Mood, and Journal: Very Pleasant `#9b72d4` → Pleasant `#5ba8e8` → Neutral `#5bc47e` → Unpleasant `#f5c842` → Very Unpleasant `#f5873a`.
- A second **pastel/"glass" palette** (`pastel`, exported from `components/Glass.jsx`) drives the app's soft-glassmorphism visual language (gradient fills, translucency, glossy borders) used on cards and the tab bar.

### 8.2 Custom Components Built

| Component | Purpose |
|---|---|
| `Glass.jsx` (`GlassCard`, `GradientHeroCard`, `GradientButton`, `ScreenGradientBackground`, `GlossyCircle`) | Core glassmorphism primitives — translucent cards, gradient CTA buttons, full-screen gradient backdrops |
| `home/SoftGlass.jsx` (`SoftCard`, `SoftHeroCard`, `SoftIcon`) | A softer/opaque variant of the glass system used by Home, Mood, Journal, Resources, Profile for consistency |
| `ThemeButton` / `ThemeInput` / `ThemePasswordInput` | Themed form controls (auth screens) |
| `ScreenTitle`, `HeaderBackButton` | Shared screen chrome |
| `MoodDot` | Small coloured indicator mapping a mood value to its palette colour, used in list rows |
| `home/CompanionAvatar` | Renders the user's chosen onboarding animal companion |
| `home/MoodSlider` | Interactive 5-level mood picker |
| `home/HabitRow` / `home/HabitModal` | Habit list row + add/edit habit sheet |
| `home/MeditationModal` / `home/MeditationSession` / `home/GuidedMeditationSession` | Meditation mode picker, timer+ambient-sound session, and the Azure-TTS narrated session with pulsing "aura" animation and completion screen |
| `home/SwipeDismissSheet` | Reusable swipe-to-dismiss bottom sheet |
| `mood/MoodInsightCard` | Renders the backend's AI-generated daily insight |
| `ThoughtRecord`, `ThoughtRecordDetail`, `thoughtRecord/parts`, `thoughtRecord/BeforeAfterReveal` | Structured CBT thought-record authoring/viewing components |
| `config/themedToast.jsx` | Custom `react-native-toast-message` renderer matching the app's theme |

---

## 9. Web Services (5%)

### 9.1 REST API Endpoints Overview

Base path: `/api`. All routes require a Bearer JWT except `/api/login`, `/api/register`, `/error`.

| Resource | Base route | Notable operations |
|---|---|---|
| Auth | `/api/login`, `/api/register` | Login / register (public) |
| Users | `/api/users` | CRUD, lookup by id/email |
| Mood entries | `/api/mood-entries` | CRUD, by-user, by-date, by-date-range, by-category, calendar `{year}/{month}`, average |
| Mood factors | `/api/mood-factors` | CRUD |
| Emotions | `/api/emotions` | CRUD, by category |
| Journal entries | `/api/journal-entries` | CRUD, by-user, by-date-range, by-type, count |
| Journal prompts | `/api/journal-prompts` | CRUD, by type |
| Habits | `/api/habits` | Create/list per user, get by id/info, delete, seed defaults |
| Habit daily logs | `/api/habits/{habitId}/logs` | Log today/a date, get today, calendar, streak, weekly stats, completion rate |
| Affirmations | `/api/affirmations` | CRUD, random, today's, seed (`/init`) |
| Reminders | `/api/reminders` | CRUD, per-user affirmation/general reminders, types |
| Calming sounds | `/api/calming-sounds` | CRUD, dropdown, search, per-sound exercises/statistics/validation, upload, seed (`/init`) |
| Mindfulness exercises | `/api/exercises` | List, by type, details, start, sound/duration config, seed |
| Breathing sessions | `/api/breathing-sessions` | Create, list per user |
| Insights | `/api/insights/today` | AI-generated daily insight for the authenticated user |

### 9.2 Backend Architecture

Classic **layered Spring Boot** architecture:

```
Controller (REST, @RestController)
   → Service / Service.impl (business logic)
       → JpaRepository (Spring Data, com.example.jpaRepository)
           → PostgreSQL
```

- `dto/` — request/response payloads decoupled from JPA entities (`LoginRequest`, `RegisterRequest`, `AuthResponse`, `InsightResponse`, `UserInsightContext`, `RuleBasedInsight`).
- `model/` — JPA entities + `enumerations/` + `exceptions/` (domain exceptions like `HabitNotFoundException`).
- `security/` — `SecurityConfig`, `JwtService`, `JwtAuthFilter`.
- `service/impl/` — implementation classes, including the AI insight pipeline (`InsightContextService`, `RuleBasedInsightServiceImpl`, `OpenAiClient`, `InsightServiceImpl`).

### 9.3 Error Handling & Response Structure

A single `@RestControllerAdvice` (`GlobalExceptionHandler`) centralises error responses as `{"error": "<message>"}`:

| Exception | HTTP status |
|---|---|
| `IllegalArgumentException` (e.g. duplicate email, "user not found") | `409 Conflict` |
| `BadCredentialsException` | `401 Unauthorized` |
| `MethodArgumentNotValidException` (bean validation failures) | `400 Bad Request` (first field error message returned) |
| Unauthenticated request to a protected route | `401 Unauthorized` (custom `authenticationEntryPoint`, JSON body) |
| Domain-specific `*NotFoundException` types | Handled per-controller / mapped to appropriate `4xx` |

---

## 10. Innovation Aspect — AI-Powered Features (10%)

### 10.1 Overview of AI Integration

Kind integrates **two independent AI/cloud services**, each solving a different problem:

1. **Microsoft Azure Speech (Text-to-Speech)** — turns hand-written meditation scripts into natural spoken narration, called **client-side**.
2. **OpenAI (Chat Completions, `gpt-4o-mini`)** — generates a short, empathetic, personalised daily wellbeing insight from the user's recent mood/habit/journal data, called **server-side**, behind a rule-based safety layer.

### 10.2 AI-Guided Meditations with Azure (Text-to-Speech / Speech Studio)

**How meditation scripts are generated:** the four guided-meditation scripts (*Body Scan*, *Loving Kindness*, *Focus*, *Sleep*) are **hand-authored, static prompts** stored in `GuidedMeditationSession.jsx` — they are not generated per-session by an LLM. Each is written and paced specifically for meditative narration (short clauses, ellipses for pacing, paragraph breaks for breathing room).

**How Azure converts them to audio:**
1. The chosen script is split into paragraphs and wrapped in **SSML** (`buildSSML`): each paragraph becomes a `<p>`, joined with `<break time="1700ms"/>`, the whole thing wrapped in `<voice name="en-US-CoraMultilingualNeural"><prosody rate="-12%">...`.
2. The client `POST`s that SSML directly to `https://<AZURE_SPEECH_REGION>.tts.speech.microsoft.com/cognitiveservices/v1` with `Ocp-Apim-Subscription-Key` and `X-Microsoft-OutputFormat: audio-24khz-48kbitrate-mono-mp3` headers.
3. The response (raw MP3 bytes) is base64-encoded client-side into a `data:audio/mpeg;base64,...` URI — no server round-trip and no temp file needed.

**Playback in the app:** the data URI is loaded into an `expo-av` `Audio.Sound`, played, and its real duration (read back from the loaded audio) drives the on-screen countdown timer, which is decoupled from the hand-picked default duration estimate. A pulsing "aura" animation (concentric rings via `Animated`) is synced to a slow breathing-like loop for the duration of playback, followed by an animated completion screen when the audio finishes or the user ends the session early.

### 10.3 LLM Integration for Mood Logs

**How mood entries are submitted:** described fully in §7.4 — mood entries (value 1–5, tagged emotions/factors, optional note) are saved via `POST /api/mood-entries` and read back to power `InsightContextService.buildInsightContext(user)`, which aggregates: 7-day and 14-day average mood, the raw 7-day mood value sequence, distinct recent emotions/factors, each habit's 7-day completion rate, and the most recent journal note.

**How the LLM processes and responds** (`GET /api/insights/today`, `InsightServiceImpl`):
1. **Rule-based safety pass first** (`RuleBasedInsightServiceImpl`) — before any LLM call:
   - Scans the latest note for crisis keyword matches (e.g. "suicide," "want to die," "hurt myself"). A match immediately short-circuits to a **hard-coded crisis-resources response** — the LLM is never called for this path.
   - Otherwise computes the longest streak of low mood values (≤2) in the last 7 days to classify `severity` as `LOW_RISK` / `MODERATE` / `ELEVATED_CONCERN`, and compares 7-day vs 14-day averages to classify `moodTrend` as `IMPROVING` / `DECLINING` / `STABLE`.
2. **LLM call** (`OpenAiClient`, only reached when there's no crisis flag) — sends a `gpt-4o-mini` chat completion with:
   - A **system prompt** that constrains the model to a warm, non-clinical "wellness companion" persona (explicitly forbidden from diagnosing/prescribing/claiming to be a professional, with an added nudge toward professional help when severity is elevated), and forces a strict JSON response shape via `response_format: json_object`.
   - A **user prompt** built from the aggregated `UserInsightContext` + the rule-based `severity`/`moodTrend` (first name, 7/14-day averages, raw mood sequence, recent emotions/factors, habit completion rates, latest journal note).
3. **Response parsing** — the JSON reply (`feeling_summary`, `recommendation`, optional `reason`) is parsed and returned as `source: "LLM"`.
4. **Fallback safety net** — if the OpenAI call fails or returns malformed JSON, the endpoint falls back to a small set of **hard-coded, severity-matched** summary/recommendation pairs (`source: "RULE_BASED_FALLBACK"`) so the feature degrades gracefully instead of failing.

**What insights/outputs are returned to the user:** an `InsightResponse` containing a short empathetic `feelingSummary`, one concrete `recommendation` (e.g. a breathing exercise, a short walk, reaching out to a counselor), an optional one-line `reason` for *why* that suggestion helps, the `source` (`LLM` vs `RULE_BASED_FALLBACK`), and the underlying rule evaluation — rendered on the Mood tab as `MoodInsightCard`.

---

## 11. Requirements Coverage Summary

### 11.1 Marking Criteria Checklist (mapped to sections)

| Criterion | Weight | Covered in | Status |
|---|---|---|---|
| Authentication | 10% | §3 | ✅ JWT auth, BCrypt, SecureStore token, auto-logout on 401 |
| Navigation | 10% | §4 | ✅ Onboarding/Auth/Main gate, 5-tab bottom nav, native stacks, modals |
| Screens & Functionalities | 10% | §5 | ✅ All 5 tabs + onboarding + auth screens + modals enumerated |
| State Management | 15% | §6 | ✅ Redux Toolkit + RTK Query + Redux Persist, tag-based cache invalidation |
| Data Handling & Persistence | 15% | §7 | ✅ JPA models, `SecureStore` vs `AsyncStorage` split, end-to-end mood flow |
| Custom UI Elements | 5% | §8 | ✅ Theming system + ~15 custom components |
| Web Services | 5% | §9 | ✅ ~15 REST resource groups, layered architecture, centralised error handling |
| Innovation — AI Features | 10% | §10 | ✅ Azure TTS guided meditation + OpenAI mood insight pipeline (with rule-based safety layer) |

### 11.2 Known Omissions (Location Services, Camera Services) & Rationale

- **Location Services** — not implemented. The app's feature set (mood tracking, journaling, breathing, meditation) has no functional dependency on the user's geographic location; adding it would introduce an unused permission and privacy surface without product value.
- **Camera Services** — not implemented. No feature in the current scope (no photo journaling, no avatar photo upload, no document/receipt scanning) requires camera access; the companion "avatar" is an illustrated/emoji asset rather than a user photo.
- Both were consciously scoped out in favour of depth on the mood/journal/AI-insight/guided-meditation feature set, which better matches a mental-wellness app's core value proposition than adding camera/location for their own sake.

---

## 12. Setup & Running the Project

### 12.1 Frontend Setup

```bash
# Prerequisites: Node.js 18+, an Expo-compatible simulator/emulator or the Expo Go app
cd Kind---Mental-Health-App-RN
yarn install        # or: npm install

yarn start           # start the Metro dev server
yarn ios             # run on iOS Simulator
yarn android         # run on Android Emulator
yarn web             # run in a browser
```

Linting & tests:
```bash
yarn lint
yarn test
```

Point the app at your backend by editing `src/config/environments.js` → `local.base_api_url` (defaults to `http://localhost:3000/`):
- **Android emulator:** `http://10.0.2.2:3000/`
- **Physical device (Expo Go):** your machine's LAN IP, e.g. `http://192.168.1.42:3000/` (phone and computer must share a network; keep the trailing slash and port). Don't commit your personal IP — leave `localhost` as the committed default.

### 12.2 Backend Setup

```bash
# Prerequisites: JDK 21, PostgreSQL 5432 running locally
cd Kind---Back-End

# 1. Create the database
psql -U postgres -c "CREATE DATABASE kind_db;"

# 2. Run (the prod profile + DB config is already active via application.properties)
./mvnw spring-boot:run
```

- Confirm DB credentials in `src/main/resources/application-prod.properties` match your local PostgreSQL `postgres` user password.
- Tables are created automatically on first run (`spring.jpa.hibernate.ddl-auto=update`) — no manual migration step.
- Once JWT auth is in place, create users through `POST /api/register` (or the app's Signup screen) rather than inserting rows manually.
- Sanity check: `http://localhost:8080/api/mood-entries/user/{id}` (with a valid Bearer token) should return `[]` for a fresh user.

### 12.3 Environment Variables & Azure Keys

**Frontend** — copy `.env.example` to `.env` (gitignored) and fill in:

```bash
API_URL=http://YOUR_LOCAL_IP:8080/

# Azure Speech (Guided Meditation TTS) — free F0 tier, 500,000 chars/month.
# Create one: Azure portal → "Speech service" → free F0 tier.
AZURE_SPEECH_KEY=your_azure_speech_key
AZURE_SPEECH_REGION=your_azure_speech_region
```
These are read into `app.config.js`'s `extra` block (`apiUrl`, `azureSpeechKey`, `azureSpeechRegion`) and consumed via `expo-constants` at runtime — **never** hardcode keys directly in source (an earlier revision did this and had to be reverted; see the comment in `GuidedMeditationSession.jsx`).

**Backend** — set as OS/CI environment variables (referenced in `application-prod.properties` via `${VAR:default}` placeholders):

```bash
OPENAI_API_KEY=your_openai_api_key      # required for the LLM insight feature
OPENAI_MODEL=gpt-4o-mini                # optional, this is the default
```
`jwt.secret` and DB credentials are currently checked into `application-prod.properties` for local development convenience — for any shared/production deployment, externalise these the same way (`${JWT_SECRET}`, `${DB_PASSWORD}`, etc.) rather than committing them.
