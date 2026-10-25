# SevaBot AI — AI Government Scheme Assistant

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646cff.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![Google Gemini](https://img.shields.io/badge/Gemini-SDK_1.29-4285f4.svg)](https://ai.google.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth_&_Firestore-ffca28.svg)](https://firebase.google.com/)

**SevaBot AI** is an advanced AI-powered citizen welfare and public service assistant for India. It enables citizens across all states and union territories to discover, evaluate, and navigate over 1,000+ government welfare schemes, subsidies, pensions, and educational grants in their native language through natural text and real-time voice conversations.

---

## Key Features

- **Multi-Tier Gemini Intelligence**:
  - 🧠 **gemini-4-argon**: Complex legal and policy evaluation (multi-criteria eligibility, tax thresholds, landholding criteria).
  - 🚀 **gemini-3.8-flash**: Balanced, responsive general welfare consultation and application guidance.
  - ⚡ **gemini-3.1-flash-lite**: High-speed, low-latency eligibility screening.
- **Dual Real-Time Grounding**:
  - 🌐 **Google Search Grounding**: Verifies live notifications, latest budget circulars, and application portal URLs.
  - 📍 **Google Maps Grounding**: Locates nearby physical Seva Kendras, CSC centers, and district welfare offices.
- **Real-Time Live Voice Conversations (`gemini-3.8-live`)**:
  - Natural, bidirectional spoken dialogue with sub-second streaming audio and instant interruption support.
- **Voice Input Transcription (`gemini-3.5-transcribe`)**:
  - High-precision audio capture and speech-to-text directly into the consultation chat input.
- **Interactive Scheme Eligibility Wizard**:
  - 5-step structured questionnaire filtering schemes based on gender, age, state, caste, minority, disability, and occupation.
- **Firebase Authentication & Firestore Persistence**:
  - Google Sign-In with Firebase Auth.
  - Synchronized bookmarks for saved schemes across devices.
  - Persistent consultation logs stored under owner-only Firestore security rules.
- **24+ Indian Regional Languages**:
  - Support for Hindi, Tamil, Telugu, Marathi, Bengali, Gujarati, Kannada, Malayalam, Odia, Punjabi, and more.
- **Comprehensive Document Export**:
  - Multi-page PDF report generation powered by `html2canvas-pro` and `jsPDF` (with full CSS `oklch` color support).
  - Clean UTF-8 text file download and one-click clipboard copying.
- **Customizable Speech Synthesis**:
  - Voice persona selection (Puck, Charon, Kore, Fenrir, Aoede), pitch adjustment (-200 to +200 cents), speed control, and volume sliders.

---

## Architecture Overview

```
[ Citizen Web Client (React 19 + TypeScript + Tailwind v4) ]
   ├── Speech Input / MediaRecorder ──► gemini-3.5-transcribe
   ├── Realtime Voice (WebSockets)  ──► gemini-3.8-live
   ├── Chat Consultations           ──► gemini-4-argon / gemini-3.8-flash / gemini-3.1-flash-lite
   │     ├── Grounding (Search)    ──► Google Search Data Grounding
   │     └── Grounding (Maps)      ──► Google Maps Data Grounding
   ├── Authentication & Sync        ──► Firebase Auth & Google Cloud Firestore
   └── Document Export Engine       ──► html2canvas-pro & jsPDF
```

For full system diagrams and technical architecture details, refer to [TECHNICAL_DESIGN.md](TECHNICAL_DESIGN.md).

---

## Getting Started

### Prerequisites

- **Node.js**: `v18.0.0` or higher (Node.js 20+ LTS recommended)
- **Package Manager**: `npm` (v9+) or `bun` / `pnpm`
- **Google Gemini API Key**: Obtain from [Google AI Studio](https://aistudio.google.com/)
- **Firebase Project**: (Optional for local dev, required for cloud sync) configured with Firestore and Google Auth.

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/sevabot-ai.git
   cd sevabot-ai
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Set your API keys inside `.env`:
   ```ini
   GEMINI_API_KEY="your_actual_gemini_api_key_here"
   APP_URL="http://localhost:3000"
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   The application will be live at `http://localhost:3000`.

---

## Environment Variables Reference

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `GEMINI_API_KEY` | **Yes** | — | Google Gemini API key used for text generation, Live API, speech synthesis, and transcription. |
| `APP_URL` | No | `http://localhost:3000` | The origin URL where the applet is hosted (used for CORS and self-referential links). |

### Firebase Configuration
Firebase settings are bootstrapped via `firebase-applet-config.json` in the root directory:
```json
{
  "apiKey": "your-api-key",
  "authDomain": "your-project.firebaseapp.com",
  "projectId": "your-project-id",
  "storageBucket": "your-project.appspot.com",
  "messagingSenderId": "your-sender-id",
  "appId": "your-app-id",
  "firestoreDatabaseId": "your-firestore-db-id"
}
```

---

## Available Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts Vite development server at `http://localhost:3000` |
| `npm run build` | Compiles production-ready bundle into `/dist` with TypeScript checks |
| `npm run preview`| Previews the built production app locally |
| `npm run lint` | Runs TypeScript compiler checks (`tsc --noEmit`) |
| `npm run clean` | Removes compiled build artifacts |

---

## Repository Structure

```
.
├── .env.example                    # Environment variable template
├── firebase-applet-config.json     # Firebase client configuration
├── firebase-blueprint.json         # Database schema & entity specifications
├── firestore.rules                 # Deployed security & authorization rules
├── metadata.json                   # Applet permissions and capabilities metadata
├── package.json                    # Project dependencies and npm scripts
├── vite.config.ts                  # Vite build and alias configuration
├── LICENSE                         # Apache 2.0 open-source license
├── README.md                       # Main setup & documentation guide
├── TECHNICAL_DESIGN.md             # In-depth architectural design document
├── tests/
│   ├── sample-data.json            # Datasets for testing profiles, schemes & queries
│   └── TEST_CASES.md               # End-to-end QA validation matrix (TC-01 to TC-11)
└── src/
    ├── App.tsx                     # Main application layout and state orchestrator
    ├── main.tsx                    # React root entry point
    ├── index.css                   # Global styles with Tailwind CSS v4
    ├── components/
    │   ├── ChatExportModal.tsx     # PDF & TXT document export with html2canvas-pro
    │   ├── SavedSchemesModal.tsx   # Saved bookmarks manager synced with Firestore
    │   ├── SchemeFinder.tsx        # Multi-step eligibility questionnaire wizard
    │   └── VoiceSettingsModal.tsx  # Voice synthesis persona & pitch controls
    ├── data/
    │   └── schemeTranslations.ts   # Localized static welfare scheme database
    ├── lib/
    │   ├── firebase.ts             # Firebase App, Auth & Firestore connection handlers
    │   ├── translations.ts         # Multilingual UI dictionary for 24 Indic languages
    │   └── utils.ts                # Class merging and layout helper utilities
    └── services/
        └── gemini.ts               # Gemini AI models, Live API & Grounding integration
```

---

## Testing & Quality Assurance

- **Sample Datasets**: Located at [`tests/sample-data.json`](tests/sample-data.json) containing citizen personas, scheme records, and sample bilingual dialogues.
- **Test Specifications**: Review the 11 formal verification cases in [`tests/TEST_CASES.md`](tests/TEST_CASES.md) covering audio streaming, grounding tools, model tiers, and PDF generation.

---

## License

This project is licensed under the **Apache License 2.0**. See the [LICENSE](LICENSE) file for complete terms.
