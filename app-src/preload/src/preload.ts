import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

interface PluginManifest {
  entry?: string;
  [key: string]: any;
}

interface Plugin {
  id: string;
  manifest: PluginManifest;
}

const getPluginList = (): Plugin[] => {
  return ipcRenderer.sendSync("SLACKMOD_GET_PLUGINS");
};

const getPluginFile = (
  pluginId: string | null,
  filePath: string,
): string | null => {
  return ipcRenderer.sendSync("SLACKMOD_READ_FILE", { pluginId, filePath });
};

contextBridge.exposeInMainWorld("slackmod_custom", {
  getPluginList,
  getPluginFile,
});

window.addEventListener("DOMContentLoaded", () => {
  console.log("[SlackMod] Preload loaded. Initializing plugins...");

  const guiCode = getPluginFile(null, "plugin-manager.js");
  if (guiCode) {
    try {
      const blob = new Blob([guiCode], { type: "text/javascript" });
      const url = URL.createObjectURL(blob);
      const script = document.createElement("script");
      script.src = url;
      script.onload = () => {
        try {
          URL.revokeObjectURL(url);
        } catch {}
        script.removeAttribute("src");
      };
      script.setAttribute("data-slackmod", "plugin-manager");
      (document.head || document.documentElement).appendChild(script);
    } catch (e) {
      console.error("GUI Init Error", e);
    }
  }

  const cssCode = getPluginFile(null, "plugin-manager.css");
  if (cssCode) {
    try {
      const style = document.createElement("style");
      style.setAttribute("data-slackmod", "plugin-manager-style");
      style.textContent = cssCode;
      document.head.appendChild(style);
    } catch (e) {
      console.error("CSS Init Error", e);
    }
  }

  const plugins = getPluginList();
  console.log(`[SlackMod] Found ${plugins.length} plugins.`);

  plugins.forEach((plugin) => {
    const entryFile = plugin.manifest.entry || "index.js";
    const code = getPluginFile(plugin.id, entryFile);
    if (!code) return;

    const module: { exports: any } = { exports: {} };

    const localRequire = (relPath: string): any => {
      const fileCode = getPluginFile(plugin.id, relPath);
      if (!fileCode) {
        console.error(
          `Cannot find module '${relPath}' in plugin '${plugin.id}'`,
        );
        return null;
      }

      const mod: { exports: any } = { exports: {} };
      try {
        new Function("require", "module", "exports", fileCode)(
          localRequire,
          mod,
          mod.exports,
        );
      } catch (err) {
        console.error(`Error requiring ${relPath}:`, err);
      }
      return mod.exports;
    };

    try {
      new Function("require", "module", "exports", code)(
        localRequire,
        module,
        module.exports,
      );

      if (module.exports && typeof module.exports.onStart === "function") {
        module.exports.onStart();
      }
      console.log(`[SlackMod] Loaded: ${plugin.id}`);
    } catch (err) {
      console.error(`[SlackMod] Failed to load ${plugin.id}:`, err);
    }
  });
});

export {};
