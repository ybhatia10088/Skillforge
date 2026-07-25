"use client";

import MonacoEditor from "@monaco-editor/react";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { SessionSocket } from "../lib/ws";

const DEBOUNCE_MS = 1500;
const IDLE_THRESHOLD_MS = 20_000;
const SNAPSHOT_INTERVAL_MS = 25_000;

export interface EditorHandle {
  getCurrentCode: () => string;
}

interface Props {
  starterCode: string;
  initialCode: string;
  socket: SessionSocket;
}

const Editor = forwardRef<EditorHandle, Props>(function Editor({ starterCode, initialCode, socket }, ref) {
  const codeRef = useRef<string>(initialCode);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIdle = useRef(false);
  const lastCode = useRef<string>(initialCode);

  useImperativeHandle(ref, () => ({
    getCurrentCode: () => codeRef.current,
  }));

  // Periodic snapshots
  useEffect(() => {
    const interval = setInterval(() => {
      socket.sendSnapshot({ source_code: codeRef.current, reason: "periodic" });
    }, SNAPSHOT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [socket]);

  function resetIdleTimer() {
    if (isIdle.current) {
      isIdle.current = false;
      socket.sendEvent({ type: "idle_end" });
    }
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      isIdle.current = true;
      socket.sendEvent({ type: "idle_start" });
    }, IDLE_THRESHOLD_MS);
  }

  function handleChange(value: string | undefined) {
    const code = value ?? "";
    const prev = codeRef.current;
    codeRef.current = code;

    const added = Math.max(0, code.length - prev.length);
    const removed = Math.max(0, prev.length - code.length);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      socket.sendEvent({
        type: "edit",
        payload: { chars_added: added, chars_removed: removed },
      });
      lastCode.current = code;
    }, DEBOUNCE_MS);

    resetIdleTimer();
  }

  function handleReset() {
    codeRef.current = starterCode;
    setKey((k) => k + 1); // remount Monaco with fresh value
    socket.sendEvent({ type: "reset" });
    socket.sendSnapshot({ source_code: starterCode, reason: "reset" });
    resetIdleTimer();
  }

  const [key, setKey] = useState(0);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface border-b border-border">
        <span className="text-xs text-muted-foreground font-mono">Python 3</span>
        <button
          onClick={handleReset}
          className="cursor-pointer text-xs text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-md border border-border hover:border-border-hover transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface"
        >
          Reset to starter
        </button>
      </div>
      <div className="flex-1">
        <MonacoEditor
          key={key}
          height="100%"
          language="python"
          theme="vs-dark"
          defaultValue={codeRef.current}
          onChange={handleChange}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            padding: { top: 12 },
          }}
        />
      </div>
    </div>
  );
});

export default Editor;
