import pluginTs from "@rollup/plugin-typescript";
import { RollupOptions } from "rollup";
import dts from "rollup-plugin-dts";
import postcss from "rollup-plugin-postcss";

const input = "src/index.ts";
const external = ["react", "react-dom", "react/jsx-runtime"];
const globals = {
  react: "React",
  "react-dom": "ReactDOM",
  "react/jsx-runtime": "jsxRuntime",
};

const config: RollupOptions[] = [
  {
    input,
    output: [
      {
        file: "dist/react-hex-viewer.cjs",
        format: "cjs",
        globals,
        sourcemap: true,
      },
      {
        file: "dist/react-hex-viewer.mjs",
        format: "es",
        globals,
        sourcemap: true,
      },
      {
        name: "ReactHexViewer",
        file: "dist/react-hex-viewer.iife.js",
        format: "iife",
        globals,
        sourcemap: true,
      },
      {
        name: "ReactHexViewer",
        file: "dist/react-hex-viewer.umd.js",
        format: "umd",
        globals,
        sourcemap: true,
      },
    ],
    external,
    plugins: [
      postcss({ extract: "style.css" }),
      pluginTs({
        exclude: ["src/stories/**/*", "rollup.config.ts"],
      }),
    ],
  },
  {
    input,
    output: [
      { format: "cjs", file: "dist/react-hex-viewer.d.cts" },
      { format: "es", file: "dist/react-hex-viewer.d.mts" },
    ],
    external,
    plugins: [postcss({ extract: false }), dts()],
  },
];

export default config;
