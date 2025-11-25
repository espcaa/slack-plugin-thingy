import type { Plugin } from "../../../types";

interface PluginListProps {
  plugins: Plugin[];
}
export default function PluginList({ plugins }: PluginListProps) {
  return (
    <div className="plugin_list">
      {plugins.map((p) => (
        <div key={p.id} className="sm-plugin-item">
          <div style={{ textAlign: "center", color: "#ababad" }}>
            {p.manifest.name || p.id}
            <span style={{ fontSize: 10, opacity: 0.5 }}>
              {" "}
              v{p.manifest.version || "1.0"}
            </span>
          </div>

          <div className="sm-plugin-desc">
            {p.manifest.description || "No description."}
          </div>
        </div>
      ))}
    </div>
  );
}
