import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

export default defineConfig({
  plugins: [
    cssInjectedByJsPlugin(),
    dts({
      tsconfigPath: resolve(__dirname, "tsconfig.app.json"),
      entryRoot: "src",
    }),
  ],
  build: {
    cssCodeSplit: false,
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "ReactHexViewer",
      formats: ["es", "umd"],
      fileName: "react-hex-viewer",
    },
    rollupOptions: {
      external: ["react", "react/jsx-runtime"],
      output: {
        globals: {
          react: "React",
          "react/jsx-runtime": "jsxRuntime",
        },
      },
    },
  },
});
