import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  // 1. flexible key search
  const rawKey = 
    env.API_KEY || 
    env.VITE_API_KEY || 
    env.GEMINI_API_KEY || 
    env.VITE_GOOGLE_API_KEY || 
    env.GOOGLE_API_KEY;

  // 2. Trim whitespace (fixes "GEMINI_API_KEY= AIza..." issue)
  const apiKey = rawKey ? rawKey.trim() : '';

  // 3. Check for custom port
  const port = parseInt(env.PORT || env.port || '5173');

  // Debug log
  if (!apiKey) {
    console.warn("\x1b[33m%s\x1b[0m", "⚠️  WARNING: No API Key found in .env file. Checked: API_KEY, VITE_API_KEY, GEMINI_API_KEY, VITE_GOOGLE_API_KEY");
  } else {
    console.log("\x1b[32m%s\x1b[0m", "✅ API Key detected and configured.");
  }

  return {
    plugins: [react()],
    server: {
      port: port, // Use the port from .env if available
      host: true, // This enables the Network URL (0.0.0.0)
    },
    define: {
      // Inject the cleaned key into process.env for the app to use
      'process.env.API_KEY': JSON.stringify(apiKey)
    }
  };
});