import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { app, ipcMain } from "electron";

const BASE = path.join(os.homedir(), ".slack-plugin-thingy");
const PLUGINS = path.join(BASE, "plugins");
const CONFIG = path.join(BASE, "config.json");
const PRELOAD = path.join(BASE, "preload.js");
const THEMES = path.join(BASE, "themes");

const readConfig = () => {
  try {
    if (fs.existsSync(CONFIG)) {
      return JSON.parse(fs.readFileSync(CONFIG, "utf8"));
    }
  } catch {}
  return { serverUrl: "", pluginsEnabled: [], themesEnabled: [] };
};

const writeConfig = (cfg: any) => {
  fs.mkdirSync(BASE, { recursive: true });
  fs.writeFileSync(CONFIG, JSON.stringify(cfg, null, 2));
};

ipcMain.on("SLACKMOD_GET_CONFIG", (e) => {
  e.returnValue = readConfig();
});

ipcMain.on("SLACKMOD_GET_PLUGINS", (e) => {
  try {
    if (!fs.existsSync(PLUGINS)) {
      e.returnValue = [];
      return;
    }
    const dirs = fs
      .readdirSync(PLUGINS, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    const result = [];
    for (const id of dirs) {
      const m = path.join(PLUGINS, id, "manifest.json");
      if (fs.existsSync(m)) {
        try {
          result.push({
            id,
            manifest: JSON.parse(fs.readFileSync(m, "utf8")),
            enabled: false,
          });
        } catch {}
      }
    }
    // set enabled : read config
    const cfg = readConfig();
    for (const p of result) {
      p.enabled = !!cfg.pluginsEnabled.find((pl: any) => pl.id === p.id);
    }
    e.returnValue = result;
  } catch {
    e.returnValue = [];
  }
});

// themes

ipcMain.on("SLACKMOD_GET_THEMES", (e) => {
  try {
    if (!fs.existsSync(THEMES)) {
      e.returnValue = [];
      return;
    }
    const dirs = fs
      .readdirSync(THEMES, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    const result = [];
    for (const id of dirs) {
      const m = path.join(THEMES, id, "manifest.json");
      if (fs.existsSync(m)) {
        try {
          result.push({
            id,
            manifest: JSON.parse(fs.readFileSync(m, "utf8")),
            enabled: false,
          });
        } catch {}
      }
    }

    // set enabled : read config
    const cfg = readConfig();
    for (const t of result) {
      t.enabled = cfg.themesEnabled.includes(t.id);
    }

    e.returnValue = result;
  } catch {
    e.returnValue = [];
  }
});

app.once("browser-window-created", (ev, win) => {
  const pre = win.webContents.session.getPreloads() || [];
  if (!pre.includes(PRELOAD)) {
    win.webContents.session.setPreloads([...pre, PRELOAD]);
  }
});

// updating :D

const FILES = [
  "preload.js",
  "main.js",
  "plugin-manager.js",
  "plugin-manager.css",
];

const updateFiles = async () => {
  const cfg = readConfig();
  for (const f of FILES) {
    const url = cfg.serverUrl + "/" + f;
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const txt = await r.text();
      fs.writeFileSync(path.join(BASE, f), txt);
    } catch {}
  }
};

ipcMain.on("SLACKMOD_UPDATE_FILES", async (e) => {
  await updateFiles();
  e.returnValue = true;
});

// plugins/themes states

ipcMain.on("SLACKMOD_SET_PLUGIN_ENABLED", (e, payload) => {
  const cfg = readConfig();
  if (!cfg.pluginsEnabled.find((p: any) => p.id === payload.pluginId)) {
    cfg.pluginsEnabled.push({ id: payload.pluginId, manifest: {} });
    writeConfig(cfg);
  }
  e.returnValue = true;
});

ipcMain.on(
  "SLACKMOD_GET_FILE",
  (e, payload: { pluginId?: string; filePath: string }) => {
    try {
      const base = payload.pluginId
        ? path.join(PLUGINS, payload.pluginId)
        : BASE;
      const fullPath = path.join(base, payload.filePath);

      if (!fullPath.startsWith(base)) {
        e.returnValue = null;
        return;
      }

      if (fs.existsSync(fullPath)) {
        e.returnValue = fs.readFileSync(fullPath, "utf8");
        return;
      }
    } catch {}
    e.returnValue = null;
  },
);

ipcMain.on("SLACKMOD_SET_PLUGIN_DISABLED", (e, payload) => {
  const cfg = readConfig();
  cfg.pluginsEnabled = cfg.pluginsEnabled.filter(
    (p: any) => p.id !== payload.pluginId,
  );
  writeConfig(cfg);
  e.returnValue = true;
});

ipcMain.on("SLACKMOD_ENABLE_THEME", (e, themeId) => {
  const cfg = readConfig();
  if (!cfg.themesEnabled.includes(themeId)) {
    cfg.themesEnabled.push(themeId);
    writeConfig(cfg);
  }
  e.returnValue = true;
});

ipcMain.on("SLACKMOD_DISABLE_THEME", (e, themeId) => {
  const cfg = readConfig();
  cfg.themesEnabled = cfg.themesEnabled.filter((t: any) => t !== themeId);
  writeConfig(cfg);
  e.returnValue = true;
});

// get a theme's css code

ipcMain.on("SLACKMOD_GET_THEME_CSS", (e, themeId) => {
  try {
    const f = path.join(THEMES, themeId, "theme.css");
    if (fs.existsSync(f)) {
      e.returnValue = fs.readFileSync(f, "utf8");
      return;
    }
  } catch {}
  e.returnValue = null;
});
// get a plugin's code + if in the manifest, css

ipcMain.on("SLACKMOD_GET_PLUGIN_CODE", (e, pluginId) => {
  try {
    const mPath = path.join(PLUGINS, pluginId, "manifest.json");
    if (!fs.existsSync(mPath)) {
      e.returnValue = { code: null, css: null };
      return;
    }
    const manifest = JSON.parse(fs.readFileSync(mPath, "utf8"));
    const entryFile = manifest.entry || "index.js";
    const codePath = path.join(PLUGINS, pluginId, entryFile);
    let code: string | null = null;
    if (fs.existsSync(codePath)) {
      code = fs.readFileSync(codePath, "utf8");
    }

    let css: string | null = null;
    if (manifest.css) {
      const cssPath = path.join(PLUGINS, pluginId, manifest.css);
      if (fs.existsSync(cssPath)) {
        css = fs.readFileSync(cssPath, "utf8");
      }
    }

    e.returnValue = { code, css };
    return;
  } catch {}
  e.returnValue = { code: null, css: null };
});
