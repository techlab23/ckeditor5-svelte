import svelte from "rollup-plugin-svelte"
import resolve from "rollup-plugin-node-resolve"
import commonjs from "rollup-plugin-commonjs"
import pkg from "./package.json"

export default {
  input: "src/Ckeditor.svelte",
  output: [
    { file: pkg.module, format: "es" },
    { file: pkg.main, format: "umd", name: "Ckeditor" }
  ],
  plugins: [svelte(), resolve(), commonjs()]
}
