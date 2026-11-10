# Charaiva Onboarding Suite: Introduction, Guided Tour, Login & Smart Settings Sync

Add a cohesive, skippable first-time onboarding flow to Charaiva consisting of an **App Introduction Page** (overview, workflow, brief option guide, and playable welcome speech), a **Skippable Interactive Screen-by-Screen App Tour**, and a **Focused Login & App Preferences Page** whose selections automatically populate **Settings** so returning users are never asked the same setup questions twice.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Please confirm your preference on these three product decisions before implementation begins:

- **Decision Gate 1 — Authentication & Persistence Mode**:
  - **Option A *(Recommended)*: Real Firebase Sign-In (Google Auth) + Cloud Firestore Sync** — Saves the user's profile and all app preferences securely to the cloud so returning across devices or sessions automatically restores their Settings (requires accepting the Firebase provisioning prompt before setup).
  - **Option B: Fast On-Device Login (`localStorage` + IndexedDB)** — Lets users enter their Name, Email, and Preferences directly without an external sign-in popup, stored persistently in their browser/device storage.
- **Decision Gate 2 — Necessary Preference Questions at Login**:
  - Ask **only** details that directly configure Charaiva's features:
    1. **Explorer Identity**: Full Name, Email, and **Traveler Style** (*Heritage Enthusiast*, *Foodie*, *Nature Explorer*, *Photographer*, or *Casual Tourist* — used to smart-preset Narration Topics & Guide Persona).
    2. **Essential Guide Preferences**: Preferred Language (20 languages), Guide Output Mode (`Speech + Text`, `Speech Only`, or `Text Only`) & Voice Gender (`Female` / `Male`), Location Mode (`Automatic GPS` or `Manual City`), Photo Memory Storage (`Save to Phone Memory: YES / NO`), and Color Atmosphere Theme.
- **Decision Gate 3 — Onboarding Sequence & Skip Behavior**:
  - **Recommended Flow**: `1. App Introduction Page` *(Skip button)* → `2. Interactive Screen-by-Screen Tour` *(Skip Tour at any step)* → `3. Login & Essential Preferences` *(Only shown if not already saved)* → `Main App (Explore)`.
  - Returning users automatically bypass Steps 1–3 and land directly on **Explore**, with a **Profile & Onboarding** panel inside **Settings** to edit details, switch accounts, or replay the Intro / Tour anytime.

---

## 1. Overview & Core Concept

- **What It Does**:
  - **App Introduction Page**: Welcomes first-time visitors with a clear explanation of what Charaiva is, its 4-step workflow (*Detect or Pick Location → Snap or Discover → Listen & Read in Your Language → Ask & Journal*), a concise guide to every main menu option, and an interactive **Listen to Charaiva's Story** audio player powered by Charaiva's speech engine. Includes a **Skip** option to bypass immediately.
  - **Interactive App Tour**: Walks users step-by-step through every primary screen and modal (*Explore Home*, *Photo Guide*, *Attractions Radar*, *AI Guide Chat*, *Interactive Map*, *Tour Journal*, *City Dossier & Deep Dive*, and *Settings*) explaining what each screen does in real-world travel scenarios. Users can click **Skip Tour & Explore Now** at any step to enter the live app immediately.
  - **Focused Login & Preferences Page**: Collects only essential explorer details and preference choices once, validates them cleanly, and writes them directly into Charaiva's **Settings** store so the user never sees those questions again.
- **Target Audience / Persona**: First-time travelers, heritage visitors, solo explorers, and families using Charaiva on mobile or desktop who want immediate clarity on features without repetitive onboarding friction.
- **Key Value**: Turns a feature-rich multimodal AI guide into an immediately intuitive travel companion while syncing personal preferences across every screen (`Photo Guide`, `Attractions`, `AI Guide`, `Map`, `Journal`, and `Settings`) from the very first tap.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Stage 1 — App Introduction Page (Skippable)**:
   - Displays Charaiva's Meenakshi Temple crest, tagline, and a concise **"How Charaiva Works"** 4-step visual workflow strip.
   - Features a built-in **"Play Welcome Speech"** control (with Play/Pause and speed toggle) that reads Charaiva's feature overview aloud using the user's selected voice, plus an expandable full-text transcript.
   - Summarizes all 7 app destinations and key options in brief, scannable blocks (no cluttered pill badges or dense walls of text).
   - Footer actions: primary **"Start Screen-by-Screen Tour"** button, secondary **"Skip to Sign In"** / **"Skip All & Explore"** escape hatch.
2. **Stage 2 — Interactive Screen-by-Screen App Tour (Skippable at Any Step)**:
   - Interactive step carousel covering all 7 core screens + Deep Dive/City Dossier capabilities:
     - *Step 1: Explore Home & City Dossier* — Live location banner, atmosphere tag, and 2-tier City Guide modal.
     - *Step 2: Photo Guide (Camera & Upload)* — Instant vision + OCR, 3-batch streaming narration, and Phone Memory YES/NO privacy toggle.
     - *Step 3: Attractions Radar* — Real verified places sorted by distance/rating with 500m–10km radius & 8 category filters, 1-line reasons, and Google Maps navigation.
     - *Step 4: AI Guide Chat* — Multilingual voice dictation and session memory that avoids repeating already-explored facts.
     - *Step 5: Interactive Sightseeing Map* — Live Leaflet markers around GPS or selected cities with 1-tap audio tours.
     - *Step 6: Tour Journal & Saved Photos* — Visit log replay and offline internal storage manager.
     - *Step 7: Settings & Personalization* — Language, output mode, voice tuning, 10 narration topics, location mode, and theme presets.
   - Each step card displays a clear visual preview layout of that screen's controls, a concise explanation of what the screen does, progress indicator (`Step X of 7`), **Previous / Next**, and an always-visible **"Skip Tour & Start Exploring"** button.
3. **Stage 3 — Focused Login & One-Time App Preferences**:
   - **Step A — Explorer Details**: Name, Email (with format validation; or 1-tap Google Sign-In if Firebase is selected), and **Traveler Style** selector (*Heritage Enthusiast*, *Foodie*, *Nature Explorer*, *Photographer*, *Casual Tourist*). Selecting a Traveler Style auto-suggests matching Narration Topics & Guide Persona (editable anytime later).
   - **Step B — Essential Preferences**: Compact interactive cards for:
     - Preferred Language (default pre-selected from 20 languages)
     - Guide Output Mode (`Speech + Text`, `Speech Only`, `Text Only`) & Voice (`Female` / `Male`)
     - Location Mode (`Automatic GPS` or `Manual City Selector`)
     - Save Clicked Photos to Phone Memory (`YES — App Data Folder` or `NO — In-Memory Only`)
     - Color Atmosphere (`Celestial Twilight`, `Sunset Radiance`, `Emerald Sanctuary`, `Royal Daylight` — updates the live UI immediately as they preview!)
   - Clicking **"Save & Start Exploring"** writes all values into **Settings**, marks setup complete, and transitions straight into the **Explore** screen.
4. **Stage 4 — Returning Users & Settings Integration**:
   - On subsequent launches, if profile & preferences are already saved, Charaiva skips Intro, Tour, and Login automatically and opens directly on **Explore**.
   - **Settings → Profile & Account** (new first sub-tab alongside *Location*, *Language*, *Output & Storage*, and *Voice*):
     - Displays the logged-in user's Name, Email, Traveler Style, and saved preference summary.
     - Allows editing profile details, toggling **Replay App Introduction** or **Replay Screen Tour**, or **Log Out / Switch Explorer**.

### Visual Identity & Theme

- **Aesthetic Direction**: Refined cultural-editorial luxury matching Charaiva's existing theme system—dark obsidian/sapphire or warm porcelain daylight surfaces accented with saffron gold (`--theme-accent-primary`) and oasis teal (`--theme-accent-secondary`).
- **Color Palette & Mood**: Uses Charaiva's existing CSS theme tokens (`--theme-bg-gradient`, `--theme-card-bg`, `--theme-card-bg-subtle`, `--theme-card-border`, `--theme-accent-primary-gradient`, `--theme-text-title`, `--theme-text-body`, `--theme-text-muted`) across all four themes (`celestial`, `sunset`, `emerald`, `daylight`) so selecting a theme during Login previews it live across the entire interface.
- **Typography & Hierarchy**: Display headings in `Cinzel` / `Playfair Display` (`text-wrap: balance`, `clamp(1.75rem, 3.5vw, 2.75rem)`) paired with `Outfit` / `Plus Jakarta Sans` body prose (`15px`, `1.6` line-height).
- **Layout Discipline**: Responsive full-width desktop layout (`max-w-5xl` two-column asymmetric grid on desktop for Intro/Tour/Login; single-column thumb-friendly layout on mobile with $\ge 44\text{px}$ interactive controls). Metadata uses clean unboxed text with `·` separators; avoids pill-badge sandwiches, decorative pulsing dots, or nested card clutter.

### Interactive Feedback & Motion

- Smooth 180ms `transform`/`opacity` step transitions between Introduction, Tour steps, and Login stages.
- Live audio waveform/status text while the Introduction Welcome Speech is playing, with instant Stop/Pause cleanup on skip or route exit.
- Inline email/name validation with clear accessible helper text and an immediate confirmation toast when preferences are synced to **Settings**.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Persistence & Sign-In Architecture**:
  - *Chosen Approach*: Support clean, centralized account & preference state hydration. If Firebase is confirmed, authenticate via Google Sign-In (`signInWithPopup`) and persist user profile + guide preferences in Firestore (`users/{uid}/private/profile` and `users/{uid}/preferences/guide`) with hardened owner-only security rules and local cache hydration; if local mode is chosen, persist cleanly in `localStorage` under a structured `charaiva_user_profile` + `charaiva_guide_settings` + `charaiva_onboarding_state` schema.
  - *Why*: Guarantees zero repeat prompts on return while keeping user PII isolated and secure.
  - *Alternatives Considered*: Asking only a transient session name without persistence—rejected because the user explicitly requested saving details in Settings so questions are never asked again.
- **Decision 2 — Traveler Style Smart-Presetting**:
  - *Chosen Approach*: Map the user's selected **Traveler Style** during Login to sensible default **Narration Topics** and **Guide Persona** (e.g., *Foodie* emphasizes `culinary` & `culturalMythology`; *Photographer* highlights `photography` & `architectural`; *Nature Explorer* enables `ecological` & `geographical`), rather than forcing the user through 10 individual topic checkboxes during onboarding.
  - *Why*: Keeps initial onboarding fast and focused strictly on essential preferences while preserving full granular customization inside **Settings → Voice & Topics**.
  - *Alternatives Considered*: Putting all 10 topic toggles, pitch sliders, and country/state/city dropdowns on the login screen—rejected as overwhelming on first launch.
- **Decision 3 — Non-Blocking Skip Anywhere Guarantee**:
  - *Chosen Approach*: Every screen in the Introduction and Tour exposes an unobstructed **Skip** button in the top-right and/or primary action footer. Skipping during Intro or Tour can either jump to Login (if no profile exists yet) or jump straight into real-time exploration (creating a default guest session if they skip Login too, while still allowing sign-in later in Settings).
  - *Why*: Respects travelers standing in front of a monument right now who want immediate camera/attractions access.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### System Architecture & Onboarding Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                         App Entry Orchestrator                       │
│   Reads Saved Auth / Profile + GuideSettings + OnboardingState       │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
          ┌─────────────────────┴─────────────────────┐
          ▼ (First Visit / Replay Triggered)          ▼ (Returning User)
┌───────────────────────────┐               ┌──────────────────────────┐
│  1. Introduction Page     │               │  Main Explorer Workspace │
│  • App Purpose & Workflow │               │  • Explore Home          │
│  • Brief Options Guide    │──Skip────────▶│  • Photo Guide           │
│  • Playable Welcome Speech│               │  • Attractions Radar     │
└─────────────┬─────────────┘               │  • AI Guide Chat         │
              │ Start Tour                  │  • Interactive Map       │
              ▼                             │  • Tour Journal          │
┌───────────────────────────┐               │  • Settings (Synced!)    │
│  2. Interactive App Tour  │               └────────────▲─────────────┘
│  • 7 Screen Walkthroughs  │──Skip Any Time─────────────┤
│  • Real-Time Control Tips │                            │
└─────────────┬─────────────┘                            │
              │ Finish / Proceed                         │
              ▼                                          │
┌───────────────────────────┐                            │
│  3. Login & Preferences   │                            │
│  • Name, Email, Style     │───Writes & Syncs Once──────┘
│  • Language, Output/Voice │   (Prefills Settings,
│  • GPS/City, Photo Save   │    Sets Setup Complete)
│  • Theme Atmosphere       │
└───────────────────────────┘
```

### Data Model & State

- **`UserProfile`** (extends existing `UserProfile` structure):
  - `uid?`: string (when signed in via Firebase)
  - `name`: string
  - `email`: string
  - `travelerType`: `'heritage_enthusiast' | 'foodie' | 'nature_explorer' | 'casual_tourist' | 'photographer'`
  - `preferredLanguage`: string (language code, e.g., `'en'`, `'hi'`, `'ta'`)
  - `createdAt` / `updatedAt`: ISO timestamp
- **`OnboardingState`**:
  - `hasSeenIntro`: boolean
  - `hasCompletedTour`: boolean
  - `hasCompletedLoginSetup`: boolean
  - `skippedDirectly`: boolean (allows entering real-time app while still offering a 1-tap "Complete Profile" banner or Settings action later)
- **`GuideSettings` + App Preferences**:
  - `outputMode`: `'speech' | 'text' | 'both'`
  - `voiceGender`: `'female' | 'male'`
  - `persona`: `'warm_female' | 'scholarly' | 'adventurous' | 'concise'`
  - `topics`: 10-topic map (smart-preset from `travelerType` on first setup, customizable anytime in Settings)
  - `savePhotosToDeviceMemory`: boolean
  - `locationMode`: `'gps' | 'manual'` (+ saved manual city if chosen)
  - `theme`: `'celestial' | 'sunset' | 'emerald' | 'daylight'`

### Interactive Component & State Mapping

- **Introduction Page Controls**:
  - `Play / Pause Welcome Speech` → invokes existing `speechManager` in the currently selected language/voice and automatically stops on step change or skip.
  - `Brief Option Accordion / Grid` → maps cleanly to each of the 7 app tabs so users understand every control before entering.
  - `Skip Intro` → marks `hasSeenIntro = true` and advances to Tour (or Login/Main App).
- **Interactive Tour Controls**:
  - `Next / Previous / Step Dots` → navigates steps `1..7` highlighting each screen's layout, real workflow, and key actions.
  - `Skip Tour & Explore in Real Time` → immediately sets `hasCompletedTour = true` and transitions either to Login (if user details aren't configured yet) or straight to the live **Explore** view.
- **Login & Preferences Form**:
  - Controlled inputs with instant inline validation (non-empty Name, valid Email format).
  - Live preference cards sync `selectedLanguage`, `outputMode`, `voiceGender`, `locationMode`, `savePhotosToDeviceMemory`, and `currentTheme` immediately into root app state + persistence store (`Firestore` and/or `localStorage`), setting `hasCompletedLoginSetup = true`.
- **Settings Screen Sync (`Profile & Account` Sub-tab + Synced Sub-tabs)**:
  - Pre-fills all controls from saved login selections.
  - Provides **Edit Profile**, **Replay Introduction**, **Replay Interactive Tour**, and **Log Out / Switch User** (which clears session flags cleanly so another user can sign in and set their own preferences).
