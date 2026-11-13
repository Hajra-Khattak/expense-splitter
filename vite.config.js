import react from "@vitejs/plugin-react";
// import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";


// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    name: { label: "unit", color: "green" },
    environment: "node",
  },
});
