# Fusion TV — LG webOS Media App & Stream Resolver Backend

A luxury media player interface modeled after **Fusion for Apple TV** and **Omni**, built for **LG webOS Smart TVs** with full D-pad remote spatial navigation, custom OLED glassmorphism, dynamic ambient lighting, and an automated stream scraper backend.

---

## Architecture

- **`public/` (webOS Front-End)**: Single-page application designed for 1080p/4K 10-foot TV viewing. Zero external styling libraries; fully GPU-accelerated CSS transforms.
- **`backend/` (Node.js Resolver)**: Express API with CORS configured to resolve `.m3u8` / `.mp4` video streams from index aggregators, with automatic CDN fallback.
- **`.github/workflows/`**: Continuous Integration workflow that packages `.ipk` binaries using `@webosbrew/ares-cli`.

---

## Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [webOS TV CLI (`ares-cli`)](https://webostv.developer.lge.com/develop/tools/cli-installation) or `@webosbrew/ares-cli`

### 2. Local Backend Setup
```bash
git clone https://github.com/your-username/fusion-tv.git
cd fusion-tv

# Install dependencies
npm install

# (Optional) Add your TMDB Key to .env
echo "TMDB_API_KEY=your_key_here" > .env

# Run scraper backend
npm start
