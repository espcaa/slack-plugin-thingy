export interface Plugin {
  id: string;
  manifest: any;
}

export interface Theme {
  id: string;
  name: string;
  description?: string;
}

export type Config = {
  serverUrl: string;
  pluginsEnabled: Array<Plugin>;
  themesEnabled?: Array<string>;
};
