import esbuild from "esbuild";

esbuild.build({
  entryPoints: ["main/src/main.ts"],
  outfile: "../install-webserver/assets/main.js",
  bundle: true,
  minify: true,
  platform: "node",
  format: "cjs",
  target: ["node18"],
  external: ["electron"],
});
