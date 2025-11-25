const fs = require("fs");
const path = require("path");
const os = require("os");

// injected into /app.asar/main.js
// probably macos-exclusive
// load ~/.slack-plugin-thingy/main.js

const homeDir = os.homedir();
const pluginThingyPath = path.join(homeDir, ".slack-plugin-thingy", "main.js");

if (fs.existsSync(pluginThingyPath)) {
  try {
    require(pluginThingyPath);
  } catch (e) {
    console.error("[SlackPluginThingy] :c we got an error loading main.js", e);
  }
} else {
  console.log(
    "[SlackPluginThingy] no ~/.slack-plugin-thingy/main.js found... what the hell did you do?",
  );
}

// load the rest of the slack app, app-arm64.asar or app-x64.asar on intel
require(process._archPath);
