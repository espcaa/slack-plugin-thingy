import esbuild from "esbuild";

esbuild.build({
  entryPoints: ["preload/src/preload.ts"],
  outfile: "../install-webserver/assets/preload.js",
  bundle: true,
  minify: true,
  platform: "node",
  format: "cjs",
  target: ["node18"],
  external: ["electron"],
});
