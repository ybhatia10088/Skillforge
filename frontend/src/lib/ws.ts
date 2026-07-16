"use client";

import { api } from "./api";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";
const MAX_BACKOFF_MS = 8000;

export interface WSEvent {
  type: string;
  payload?: Record<string, unknown>;
  ts?: string;
}

export interface WSSnapshot {
  source_code: string;
  reason: string;
  ts?: string;
}

export class SessionSocket {
  private socket: WebSocket | null = null;
  private sessionId: string;
  private pendingEvents: WSEvent[] = [];
  private pendingSnapshots: WSSnapshot[] = [];
  private backoffMs = 500;
  private closed = false;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.connect();
    // Periodically flush pending queue via HTTP if socket is down
    this.flushTimer = setInterval(() => this.flushPending(), 5000);
  }

  private connect() {
    if (this.closed) return;
    try {
      this.socket = new WebSocket(`${WS_BASE}/ws/sessions/${this.sessionId}`);
      this.socket.onopen = () => {
        this.backoffMs = 500;
        this.flushPending();
      };
      this.socket.onclose = () => {
        if (!this.closed) {
          setTimeout(() => this.connect(), this.backoffMs);
          this.backoffMs = Math.min(this.backoffMs * 2, MAX_BACKOFF_MS);
        }
      };
      this.socket.onerror = () => this.socket?.close();
    } catch {
      setTimeout(() => this.connect(), this.backoffMs);
    }
  }

  private async flushPending() {
    if (this.pendingEvents.length === 0 && this.pendingSnapshots.length === 0) return;

    if (this.socket?.readyState === WebSocket.OPEN) {
      const batch = { events: [...this.pendingEvents], snapshots: [...this.pendingSnapshots] };
      this.pendingEvents = [];
      this.pendingSnapshots = [];
      this.socket.send(JSON.stringify(batch));
    } else {
      // Drain via HTTP fallback
      const batch = { events: [...this.pendingEvents], snapshots: [...this.pendingSnapshots] };
      this.pendingEvents = [];
      this.pendingSnapshots = [];
      try {
        await api.postEvents(this.sessionId, batch);
      } catch {
        // Re-queue on network failure; prepend to preserve order
        this.pendingEvents = [...batch.events, ...this.pendingEvents];
        this.pendingSnapshots = [...batch.snapshots, ...this.pendingSnapshots];
      }
    }
  }

  sendEvent(event: WSEvent) {
    this.pendingEvents.push({ ...event, ts: event.ts ?? new Date().toISOString() });
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.flushPending();
    }
  }

  sendSnapshot(snapshot: WSSnapshot) {
    this.pendingSnapshots.push({ ...snapshot, ts: snapshot.ts ?? new Date().toISOString() });
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.flushPending();
    }
  }

  destroy() {
    this.closed = true;
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.socket?.close();
  }
}
