export interface Plugin {
  id: string;
  manifest: any;
}

export type Config = {
  serverUrl: string;
  pluginsEnabled: Array<Plugin>;
};
