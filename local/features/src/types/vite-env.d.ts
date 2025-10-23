/// <reference types="vite/client" />

// Vite CSS inline import types
declare module "*.css?inline" {
  const content: string;
  export default content;
}
