🧠 Offline Transcription Mobile App (TurboScribe-style)
Technical Specification (v1.0)
📌 Overview

An offline-first mobile transcription app built with React Native that allows users to:

Record audio
Upload audio or video (extract audio automatically)
Transcribe locally (no internet required)
Save history
Copy/export transcripts

💰 Monetization: One-time payment (no subscriptions, no API costs)

🏗️ Architecture
High-Level Flow
[User Input]
   ↓
[Audio / Video Upload]
   ↓
[Audio Extraction (if video)]
   ↓
[Audio Preprocessing]
   ↓
[Local Transcription Engine]
   ↓
[Result Processing]
   ↓
[Local Storage]
   ↓
[UI Display + Actions]
📱 Tech Stack
Frontend
React Native (Expo Dev Client or Bare Workflow)
TypeScript
Zustand (state management) OR React Context
Native Layer
iOS: Swift
Android: Kotlin
Core Engines
Whisper.cpp (offline transcription)
FFmpeg (audio extraction)
Storage
SQLite (recommended) OR MMKV
🧠 Transcription Engine
Engine
Whisper.cpp (C/C++ port of Whisper)
Model Strategy
Model	Size	Use
tiny	~75MB	Default / fast
base	~140MB	Balanced
small	~244MB	High accuracy
📦 Model Management
Default Behavior
Download tiny model on first launch
Storage Structure
/app_data/models/
  tiny.bin
  base.bin
  small.bin
Features
Download models
Delete models
Check storage usage
Resume downloads
🎙️ Audio Input
Supported Formats
.mp3
.wav
.m4a
.aac
.mp4 (video)
🎥 Video Handling
Process
Detect video file
Extract audio using FFmpeg
Command Example
ffmpeg -i input.mp4 -vn -acodec pcm_s16le -ar 16000 -ac 1 output.wav
🔊 Audio Preprocessing

All audio must be converted to:

Mono
16kHz sample rate
PCM 16-bit WAV
⚙️ Transcription Pipeline
Input Audio
   ↓
Convert to WAV (16kHz mono)
   ↓
Pass to Whisper.cpp
   ↓
Run inference
   ↓
Return raw transcript
   ↓
Post-process (punctuation/formatting)
🧾 Data Storage
Schema
Transcriptions Table

- id (UUID)
- fileName (string)
- duration (number)
- transcript (text)
- modelUsed (string)
- createdAt (timestamp)
🧠 Features
Core Features
Record audio
Upload audio/video
Offline transcription
View history
Copy transcript
Advanced Features (Phase 2+)
Model switching
Re-run transcription with better model
Smart paragraph formatting
Segment timestamps
Rename & tag entries
🎯 UX Flow
First Launch
Auto download tiny model
Show loading progress
Main Screen
Record button
Upload button
History list
Transcription Screen
Loading state
Transcript display
Copy button
“Improve Accuracy” (rerun with better model)
Models Screen
Installed models
Download options
Storage usage
⚡ Performance Considerations
Model	Speed
tiny	near real-time
base	~1x audio length
small	slower
🔋 Optimization
Run transcription in background thread
Avoid blocking UI
Show progress indicators
🚧 Challenges
1. Native Integration
Bridging whisper.cpp to RN
2. Memory Usage
Models require high RAM
3. Large File Handling
Audio/video processing
4. Background Execution
iOS limitations
🔐 Privacy
All data processed locally
No uploads to servers
Files stored securely on device
Optional: auto-delete raw audio after transcription
💰 Monetization
Option A (Recommended)
Paid app → full access