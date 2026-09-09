# OpenBeat Audiophile — Vanilla PWA

Converted from the Vite/React project into the structure/language of the OpenBeat Next v5.1 reference project: plain HTML + CSS + JavaScript, no Node/Vite/npm runtime required for the frontend.

## Preserved / added
- Audiophile charcoal design direction from the Vite project
- Responsive desktop/mobile layout
- PWA manifest, service worker and install prompt
- HTML5 audio playback with Media Session controls for local/stream audio
- Queue, liked songs, history, shuffle, repeat, seek, volume and keyboard controls
- YouTube IFrame playback for API search results
- Secure `/api/search?q=` Vercel serverless API contract
- `YOUTUBE_API_KEY` stays server-side in Vercel Environment Variables
- Local audio file support
- Lyrics/settings/player/queue modals
- Vercel-ready static deployment

## Deploy
1. Upload the folder to GitHub.
2. Import the repo into Vercel.
3. Add `YOUTUBE_API_KEY` under Vercel Project Settings → Environment Variables.
4. Redeploy.
5. Open the deployed HTTPS URL and install the PWA from the browser.

### Important
Browser/OS policies can limit background playback of embedded YouTube video. HTML5 audio sources use the browser Media Session API and are the reliable background-capable path.
