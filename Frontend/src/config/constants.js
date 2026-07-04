const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5212/api";
const SIGNALR_HUB_URL = import.meta.env.VITE_SIGNALR_HUB_URL || "http://localhost:5212/hubs/visiongate";
export const AI_CORE_URL = import.meta.env.VITE_AI_CORE_URL || "http://localhost:8000";

export { API_BASE_URL, SIGNALR_HUB_URL };
