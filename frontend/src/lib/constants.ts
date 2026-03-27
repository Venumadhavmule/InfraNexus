// ── Graph Defaults ─────────────────────────────────────────
export const MAX_NODES_DEFAULT = 500;
export const MAX_NODES_LIMIT = 2000;
export const DEFAULT_HOPS: 1 | 2 | 3 = 1;
export const DEGREE_THRESHOLD_DEFAULT = 0;

// ── UI Timing ──────────────────────────────────────────────
export const DEBOUNCE_MS = 150;
export const SEARCH_DEBOUNCE_MS = 250;
export const CAMERA_FLY_DURATION_MS = 800;
export const WS_RECONNECT_DELAY_MS = 3000;
export const WS_MAX_RECONNECT_ATTEMPTS = 10;

// ── Force Simulation ───────────────────────────────────────
export const FORCE_CHARGE_STRENGTH = -120;
export const FORCE_LINK_DISTANCE = 50;
export const FORCE_CENTER_STRENGTH = 0.05;
export const FORCE_ALPHA_DECAY = 0.004;
export const FORCE_WARMUP_TICKS = 100;
export const FORCE_COOLDOWN_TIME = 15_000;
export const RADIAL_RING_SPACING = 90;
export const HIERARCHICAL_LAYER_SPACING = 110;

// ── Visual Thresholds ──────────────────────────────────────
export const LABEL_VISIBILITY_DISTANCE = 300;
export const NODE_HOVER_SCALE = 1.4;
export const EDGE_PARTICLE_COUNT = 4;
export const EDGE_PARTICLE_SPEED = 0.006;

// ── API ────────────────────────────────────────────────────
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
export const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";

// ── Validation ─────────────────────────────────────────────
export const SYS_ID_REGEX = /^[0-9a-f]{32}$/;
