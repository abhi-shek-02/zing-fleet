/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** Default vendor for `/savari/bot` load (matches seed `175236` if unset). */
  readonly VITE_SAVARI_VENDOR_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
