import { defineConfig } from 'vite';

// Relative asset paths, so the built app runs from any URL prefix: a GitHub Pages
// project site (/grammar-drills/), a custom domain at the root, or a local dist/.
// The app is a single page with no router, so nothing else depends on the prefix.
export default defineConfig({
  base: './',
});
