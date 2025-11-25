import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { app, ipcMain, IpcMainEvent, BrowserWindow } from "electron";
import type { Plugin, Config } from "../../types";

const PLUGIN_BASE = path.join(os.homedir(), ".slack-plugin-thingy", "plugins");
const BASE_PATH = path.join(os.homedir(), ".slack-plugin-thingy");
const PRELOAD_PATH = path.join(
  os.homedir(),
  ".slack-plugin-thingy",
  "preload.js",
);
const CONFIG_PATH = path.join(
  os.homedir(),
  ".slack-plugin-thingy",
  "config.json",
);

// config file - ~/.slack-plugin-thingy/config.json

const fetchConfig = (): Config => {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, "utf8");
      const config = JSON.parse(raw) as Config;
      return config;
    }
  } catch (e) {
    console.error("Config Load Error", e);
  }

  return {
    serverUrl: "",
    pluginsEnabled: [],
  };
};

ipcMain.on("SLACKMOD_GET_CONFIG", (event: IpcMainEvent) => {
  const config = fetchConfig();
  event.returnValue = config;
});

ipcMain.on("SLACKMOD_GET_PLUGINS", (event: IpcMainEvent) => {
  try {
    if (!fs.existsSync(PLUGIN_BASE)) {
      event.returnValue = [];
      return;
    }

    const entries = fs.readdirSync(PLUGIN_BASE, { withFileTypes: true });
    const folders = entries.filter((d) => d.isDirectory()).map((d) => d.name);

    const plugins: Array<{ id: string; manifest: Record<string, unknown> }> =
      [];
    for (const folder of folders) {
      const manifestPath = path.join(PLUGIN_BASE, folder, "manifest.json");
      if (fs.existsSync(manifestPath)) {
        try {
          const raw = fs.readFileSync(manifestPath, "utf8");
          const manifest = JSON.parse(raw) as Record<string, unknown>;
          plugins.push({ id: folder, manifest });
        } catch (e) {
          console.error("Manifest Error", e);
        }
      }
    }

    event.returnValue = plugins;
  } catch (e) {
    console.error("Plugin List Error", e);
    event.returnValue = [];
  }
});

ipcMain.on(
  "SLACKMOD_READ_FILE",
  (event: IpcMainEvent, payload: { pluginId?: string; filePath: string }) => {
    try {
      const base = payload.pluginId
        ? path.join(PLUGIN_BASE, payload.pluginId)
        : path.join(os.homedir(), ".slack-plugin-thingy");
      const fullPath = path.join(base, payload.filePath);

      if (!fullPath.startsWith(base)) {
        console.error("Blocked illegal path access:", fullPath);
        event.returnValue = null;
        return;
      }

      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, "utf8");
        event.returnValue = content;
      } else {
        event.returnValue = null;
      }
    } catch (e) {
      console.error("Read File Error", e);
      event.returnValue = null;
    }
  },
);

app.once(
  "browser-window-created",
  (event: Electron.Event, win: BrowserWindow) => {
    const preloads = win.webContents.session.getPreloads() ?? [];
    if (!preloads.includes(PRELOAD_PATH)) {
      win.webContents.session.setPreloads([...preloads, PRELOAD_PATH]);
      console.log("[SlackMod] Injected custom preload");
    }
  },
);

// updating :D

const files_to_update = ["preload.js", "main.js", "plugin-manager.js"];

const update = async () => {
  // we need the config for the server url

  const config = fetchConfig();

  for (const file of files_to_update) {
    const sourcePath = config.serverUrl + "/" + file;

    try {
      // fetch the file from sourcePath
      const response = await fetch(sourcePath);
      if (!response.ok) {
        console.error(`Failed to fetch ${sourcePath}: ${response.statusText}`);
        continue;
      }

      const data = await response.text();

      let destPath = path.join(BASE_PATH, file);

      fs.promises.writeFile(destPath, data, "utf8");
      console.log(`[SlackMod] Updated ${file} successfully.`);
    } catch (e) {
      console.error(`Error updating ${file}:`, e);
    }
  }
};

ipcMain.on("SLACKMOD_UPDATE_FILES", async (event: IpcMainEvent) => {
  await update();
  event.returnValue = true;
});
