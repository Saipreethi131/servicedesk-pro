import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Must match CLIENT_ORIGIN in server/.env: the server's CORS check compares the browser's origin exactly.
  server: { port: 5173, strictPort: true },
});
