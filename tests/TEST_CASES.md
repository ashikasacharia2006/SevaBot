# SevaBot AI — Quality Assurance & Test Cases Matrix

This document defines the formal test suite, execution procedures, and verification criteria for **SevaBot AI** (AI Government Scheme & Citizen Welfare Assistant).

---

## Test Execution Summary

| Suite ID | Category | Test Target | Automated / Manual | Status |
| :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Internationalization | 24 Indic Languages Dynamic Switch & Translation | Automated / Unit | Passed |
| **TC-02** | Questionnaire Engine | Eligibility Wizard (Age, State, Caste, BPL, Occupation) | Automated / E2E | Passed |
| **TC-03** | Gemini Model Tiers | Tier Selection (`4-argon`, `3.8-flash`, `3.1-flash-lite`) | Automated / Integration | Passed |
| **TC-04** | Grounding Systems | Google Search Data Grounding (`{ googleSearch: {} }`) | Integration / API | Passed |
| **TC-05** | Grounding Systems | Google Maps Data Grounding (`{ googleMaps: {} }`) | Integration / API | Passed |
| **TC-06** | Real-time Voice | Bidirectional Live Voice API (`gemini-3.8-live`) | Interactive / WebAudio | Passed |
| **TC-07** | Audio Transcription | Microphone Audio Capture & `gemini-3.5-transcribe` | MediaRecorder / API | Passed |
| **TC-08** | Authentication | Google Sign-in with Firebase Auth & Session Sync | Security / Auth | Passed |
| **TC-09** | Database Persistence | Firestore Scheme Bookmarks & Chat Consultation Log | Database / Firestore | Passed |
| **TC-10** | Document Generation | Multi-Page Advisory PDF Export (`html2canvas-pro` + `oklch`) | Render / Canvas | Passed |
| **TC-11** | Speech Synthesis | Voice Persona Settings (Pitch, Speed, Gender, Volume) | WebAudio / TTS | Passed |

---

## Detailed Test Specifications

### TC-01: Multilingual Greeting & Dynamic Language Switch
- **Objective**: Verify that selecting any of the 24 Indian official languages instantly updates system prompts, greeting cards, and UI labels.
- **Preconditions**: Application loaded on any supported browser (Chrome, Edge, Safari, Firefox).
- **Execution Steps**:
  1. Click the Language dropdown in the top navigation or chat header.
  2. Select **"हिन्दी (Hindi)"**, **"தமிழ் (Tamil)"**, or **"বাংলা (Bengali)"**.
  3. Observe initial greeting and header text.
  4. Submit an advisory query in the selected language.
- **Expected Outcome**:
  - UI labels and quick-action chips re-render in the target language.
  - Model responds in the chosen Indian language using context-aware cultural and administrative terms.
- **Verification Rule**: Zero mojibake or broken Unicode matras; all 24 languages listed in `LANGUAGES` array render accurately.

---

### TC-02: Scheme Eligibility Engine Multi-Step Questionnaire
- **Objective**: Ensure the 5-step questionnaire filters database schemes based on user demographic attributes.
- **Test Data**: Use `CITIZEN-001` (Ramesh Kumar Patel, 42y, Farmer, Gujarat, OBC, BPL).
- **Execution Steps**:
  1. Click **"Find Schemes For You"** button.
  2. Select Gender: `Male`, Age: `42`.
  3. Select State: `Gujarat`, Area: `Rural`.
  4. Select Caste: `OBC`, Minority: `No`, Differently Abled: `No`.
  5. Select Occupation: `Agriculture / Farmer`, Economic Status: `BPL`.
  6. Click **"Check Eligibility"**.
- **Expected Outcome**:
  - Results display **PM-KISAN**, **PM Fasal Bima Yojana**, and **Kisan Credit Card (KCC)**.
  - Each scheme card displays Ministry, Benefit Summary, Eligibility criteria, and Direct Apply Link.
  - Bookmark icon is clickable and triggers bookmark state toggle.

---

### TC-03: Gemini Multi-Turn Chatbot Model Tier Selection
- **Objective**: Verify that users can toggle between Model Tiers based on inquiry complexity.
- **Execution Steps**:
  1. In the chat interface model control bar, select:
     - **3.8 Flash (General)**: Ask general welfare questions.
     - **4 Argon (Complex)**: Ask multi-layered tax/landholding eligibility questions.
     - **3.1 Lite (Fast)**: Ask quick yes/no eligibility questions.
  2. Inspect API call payload in `services/gemini.ts`.
- **Expected Outcome**:
  - `model` parameter sent to `@google/genai` matches selected tier:
    - `gemini-3.8-flash`
    - `gemini-4-argon` (thinking budget omitted or thinking level used)
    - `gemini-3.1-flash-lite`
  - Response maintains full multi-turn context from previous conversational history.

---

### TC-04: Google Search Data Grounding Integration
- **Objective**: Ensure Gemini generates real-time fact-checked responses citing latest government portal circulars.
- **Execution Steps**:
  1. In Chat Grounding toggle, select **"Search"**.
  2. Enter query: *"What are the latest subsidy percentages under PM Surya Ghar Muft Bijli Yojana?"*
  3. Submit query.
- **Expected Outcome**:
  - Model uses `{ googleSearch: {} }` tool parameter.
  - Model cites official subsidy ceilings (e.g., up to ₹78,000 for 3kW systems) and directs citizen to `pmsuryaghar.gov.in`.

---

### TC-05: Google Maps Data Grounding Integration
- **Objective**: Ensure citizens can find physical Seva Kendras, CSC centers, and District Welfare Offices.
- **Execution Steps**:
  1. In Chat Grounding toggle, select **"Maps"**.
  2. Enter query: *"Find nearest Common Service Center (CSC) in Lucknow near Hazratganj."*
  3. Submit query.
- **Expected Outcome**:
  - Request uses `{ googleMaps: {} }` grounding tool.
  - Model provides exact administrative landmarks, addresses, and operating hours.
  - Note: System strictly prevents calling `googleSearch` and `googleMaps` in the same API request to avoid API incompatibility.

---

### TC-06: Real-Time Live Voice Conversations (`gemini-3.8-live`)
- **Objective**: Test bidirectional real-time audio interaction with interruption support.
- **Execution Steps**:
  1. Click the **"LIVE"** button in chat header or Hero section.
  2. Grant microphone permissions when prompted.
  3. Speak a spoken query in English or Hindi into the microphone.
  4. While the model is speaking audio back, begin speaking again.
- **Expected Outcome**:
  - Full-screen animated voice portal opens with audio wave rings.
  - 16kHz Int16 PCM audio is streamed over WebSocket connection to `gemini-3.8-live`.
  - Model synthesizes 24kHz raw PCM audio in real-time.
  - Interruption frame halts current playback queue immediately when citizen speaks.

---

### TC-07: Audio Recording & Transcription (`gemini-3.5-transcribe`)
- **Objective**: Verify that clicking the chat microphone records speech and transcribes it directly into the input text area.
- **Execution Steps**:
  1. In the chat box, click the microphone button.
  2. Speak: *"How do I apply for Ayushman Bharat Card for my grandmother?"*
  3. Click the mic button again (or wait for stop).
- **Expected Outcome**:
  - Browser starts `MediaRecorder` audio capture (WebM/MP4).
  - Amber banner appears: *"Transcribing speech with gemini-3.5-transcribe..."*.
  - Base64 audio blob is sent to `ai.models.generateContent` with model `gemini-3.5-transcribe`.
  - Transcribed text appears in input field ready to send.

---

### TC-08: Firebase Google Sign-In & Security Rules
- **Objective**: Authenticate user via Google OAuth popup and initialize user profile in Firestore.
- **Execution Steps**:
  1. Click **"Sign In"** button in navigation bar.
  2. Complete Google OAuth popup flow.
- **Expected Outcome**:
  - Navigation bar updates to display user's profile avatar and display name.
  - User document created/updated in Firestore under `/users/{uid}`.
  - Unauthenticated access attempts to `/users/{uid}/*` are blocked by `firestore.rules`.

---

### TC-09: Firestore Scheme Bookmarks & Chat Session Persistence
- **Objective**: Verify that saved scheme bookmarks and chat consultation sessions persist across browser sessions.
- **Execution Steps**:
  1. While signed in, save 2 schemes (e.g. *PM-KISAN* and *Ayushman Bharat*).
  2. Send 3 messages in the chat.
  3. Refresh the browser page.
  4. Open the "Saved Schemes" modal and inspect chat session.
- **Expected Outcome**:
  - Saved schemes counter displays `2`.
  - Modal lists both schemes with direct apply links and "Ask SevaBot" shortcuts.
  - Consultation history is saved under `users/{uid}/chatSessions/latest-consultation`.

---

### TC-10: Multi-Page Advisory Report PDF & Text Export
- **Objective**: Verify that chat consultation logs can be exported as high-resolution multi-page PDF documents without crashing on modern `oklch()` colors.
- **Execution Steps**:
  1. Open the Chat Export dialog via the **"Export"** button in chat header.
  2. Verify that live document preview renders citizen queries and SevaBot advisories.
  3. Click **"Download Advisory PDF"**.
  4. Click **"Download TXT"**.
- **Expected Outcome**:
  - `html2canvas-pro` converts DOM without throwing `unsupported color function "oklch"`.
  - Multi-page PDF is saved as `SevaBot_Citizen_Advisory_YYYY-MM-DD.pdf`.
  - Text file contains UTF-8 BOM (`\uFEFF`) and clean ASCII borders for perfect Unicode rendering in Notepad/Word.

---

### TC-11: Voice Settings Customization
- **Objective**: Customize voice persona, gender, pitch, speed, and auto-play settings.
- **Execution Steps**:
  1. Click the **Voice Settings** gear icon in the chat header.
  2. Change Voice to **"Aoede"** or **"Puck"**.
  3. Adjust Pitch (+150 cents) and Speed (1.25x).
  4. Toggle Auto-Play.
  5. Click **"Save Settings"**.
- **Expected Outcome**:
  - Settings persist in `localStorage` under `sevabot_voice_settings`.
  - Next audio response plays using the selected voice persona and customized pitch detune.
