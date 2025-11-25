import { useState } from "react";
import Toggle from "../../../components/Toggle";
import type { Plugin } from "../../../types";
import "./plugin-list.css";

interface PluginListProps {
  plugins: Plugin[];
}
export default function PluginList({ plugins }: PluginListProps) {
  return (
    <div className="plugin-list">
      {plugins.map((p) => (
        <div key={p.id} className="plugin-item">
          <div className="plugin-header">
            <div>{p.manifest.name || p.id}</div>
            <div>
              <span style={{ fontSize: 10, opacity: 0.5 }}>
                {" "}
                v{p.manifest.version || "1.0"}
              </span>
              <input
                type="checkbox"
                style={{ marginLeft: 8 }}
                onClick={() => {
                  // get the state of the checkbox
                  const enabled = (event?.target as HTMLInputElement).checked;
                  if (enabled) {
                    (window as any).slackmod_custom.enablePlugin(p.id);
                  } else {
                    (window as any).slackmod_custom.disablePlugin(p.id);
                  }
                }}
              />
            </div>
          </div>

          <div className="plugin-desc">
            {p.manifest.description || "No description."}
          </div>
        </div>
      ))}
    </div>
  );
}
