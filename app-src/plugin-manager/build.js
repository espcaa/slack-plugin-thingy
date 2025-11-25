const esbuild = require("esbuild");

esbuild
  .build({
    entryPoints: ["plugin-manager/src/index.tsx"],
    outfile: "../install-webserver/assets/plugin-manager.js",
    bundle: true,
    minify: true,
    format: "iife",
    globalName: "SlackMod",
    platform: "browser",
    target: ["chrome120"],
    loader: {
      ".css": "css",
    },
  })
  .catch(() => process.exit(1));
