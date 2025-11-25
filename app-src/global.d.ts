interface Window {
  slackmod_custom: {
    getPluginList: () => Array<{ id: string; manifest: any }>;
    getPluginFile: (pluginId: string, filePath: string) => string | null;
  };
}
