/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  // Backward compatibility (some components still reference this)
  readonly VITE_API_BASE?: string;
  // Add other environment variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// JSON module declarations
declare module '*.json' {
  const value: any;
  export default value;
}
