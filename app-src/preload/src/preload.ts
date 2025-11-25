import { contextBridge, ipcRenderer } from "electron";

interface PluginManifest {
  entry?: string;
  css?: string | string[];
  [key: string]: any;
}

interface Plugin {
  id: string;
  manifest: PluginManifest;
  enabled: boolean;
}

interface ThemeManifest {
  name: string;
  description?: string;
  [key: string]: any;
}

interface Theme {
  id: string;
  manifest: ThemeManifest;
  enabled: boolean;
}

interface LoadedPlugin {
  id: string;
  manifest: PluginManifest;
}

const ipcSync = <T>(channel: string, payload?: any): T =>
  ipcRenderer.sendSync(channel, payload);

const getPluginList = (): Plugin[] => ipcSync<Plugin[]>("SLACKMOD_GET_PLUGINS");

const getTHemesList = (): Theme[] => ipcSync<Theme[]>("SLACKMOD_GET_THEMES");

interface PluginCode {
  code: string | null;
  css: string | null;
}

const getFile = (pluginId: string | null, filePath: string): string | null => {
  return ipcRenderer.sendSync("SLACKMOD_GET_FILE", { pluginId, filePath });
};

const getPluginFile = (pluginId: string | null): PluginCode => {
  if (!pluginId) return { code: null, css: null };
  return ipcRenderer.sendSync("SLACKMOD_GET_PLUGIN_CODE", pluginId);
};

const getThemeFile = (themeId: string): string | null => {
  return ipcRenderer.sendSync("SLACKMOD_GET_THEME_CSS", themeId);
};

const injectJS = (code: string, id: string) => {
  const blob = new Blob([code], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const script = document.createElement("script");
  script.src = url;
  script.onload = () => {
    try {
      URL.revokeObjectURL(url);
    } catch {}
    script.removeAttribute("src");
  };
  script.setAttribute("data-slackmod", id);
  (document.head || document.documentElement).appendChild(script);
};

const injectCSS = (code: string, id: string) => {
  const style = document.createElement("style");
  style.setAttribute("data-slackmod", id);
  style.textContent = code;
  document.head.appendChild(style);
};

const loadPlugin = (plugin: Plugin): LoadedPlugin | null => {
  const code = getPluginFile(plugin.id);
  if (!code) return null;

  // try to inject css first

  if (code.css) {
    injectCSS(code.css, `plugin-${plugin.id}-style`);
  }

  // then inject js

  if (code.code) {
    injectJS(code.code, `plugin-${plugin.id}`);
  }

  return {
    id: plugin.id,
    manifest: plugin.manifest,
  };
};

const loadTheme = (themeId: string) => {
  const css = getThemeFile(themeId);
  if (css) {
    injectCSS(css, `theme-${themeId}-style`);
  }
};

contextBridge.exposeInMainWorld("slackmod_custom", {
  getPluginList,
  getPluginFile,
  enablePlugin: (pluginId: string) =>
    ipcSync<boolean>("SLACKMOD_ENABLE_PLUGIN", pluginId),
  disablePlugin: (pluginId: string) =>
    ipcSync<boolean>("SLACKMOD_DISABLE_PLUGIN", pluginId),
  getThemeList: getTHemesList,
  enableTheme: (themeId: string) =>
    ipcSync<boolean>("SLACKMOD_ENABLE_THEME", themeId),
  disableTheme: (themeId: string) =>
    ipcSync<boolean>("SLACKMOD_DISABLE_THEME", themeId),
});

window.addEventListener("DOMContentLoaded", () => {
  const guiJS = getFile(null, "plugin-manager.js");
  if (guiJS) injectJS(guiJS, "plugin-manager");

  const guiCSS = getFile(null, "plugin-manager.css");
  if (guiCSS) injectCSS(guiCSS, "plugin-manager-style");

  const plugins = getPluginList();
  const themes = getTHemesList();

  console.log(`[SlackMod] Found ${themes.length} themes.`);

  themes.forEach((theme) => {
    if (theme.enabled) {
      loadTheme(theme.id);
    }
  });
  console.log(`[SlackMod] Found ${plugins.length} plugins.`);

  plugins.forEach((plugin) => {
    if (plugin.enabled) {
      const loaded = loadPlugin(plugin);
      if (loaded) {
        console.log(`[SlackMod] Loaded plugin: ${loaded.id}`);
      } else {
        console.log(`[SlackMod] Failed to load plugin: ${plugin.id}`);
      }
    }
  });
});

export {};
