const IS_PROD = import.meta.env.PROD;

const API_BASE_URL = IS_PROD ? "https://api.nguyennanganh.dev/api" : (import.meta.env.VITE_API_BASE_URL || "http://localhost:5212/api");
const SIGNALR_HUB_URL = IS_PROD ? "https://api.nguyennanganh.dev/hubs/visiongate" : (import.meta.env.VITE_SIGNALR_HUB_URL || "http://localhost:5212/hubs/visiongate");
export const AI_CORE_URL = IS_PROD ? "https://api.nguyennanganh.dev/ai" : (import.meta.env.VITE_AI_CORE_URL || "http://localhost:8000");

export { API_BASE_URL, SIGNALR_HUB_URL };
