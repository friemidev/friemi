export type MotionState = "off" | "requesting" | "waiting" | "on" | "unsupported" | "denied" | "unavailable";
export type MotionSample = { acceleration?: { x: number | null; y: number | null; z: number | null } | null; accelerationIncludingGravity?: { x: number | null; y: number | null; z: number | null } | null };
export function createShakeDetector(): { reset(): void; feed(event: MotionSample, now: number): boolean; hasReading(event: MotionSample): boolean };
export function createMotionRoller(options: { canRoll(): boolean; onRoll(): void; onState(state: MotionState): void; host?: Window }): { readonly state: MotionState; enable(): Promise<boolean>; disable(): void; reset(): void; destroy(): void };
export type DiceAudioRollStatus = "played" | "canceled" | "blocked";
export function createDiceAudio(host?: Window): { readonly context: AudioContext | undefined; enable(): Promise<boolean>; roll(duration?: number, count?: number): Promise<DiceAudioRollStatus>; stop(): void; disable(): void; dispose(): void };
