"use client";

import { useEffect, useRef } from "react";
import { useETLStore } from "@/store/etlStore";
import { WS_BASE_URL, WS_RECONNECT_DELAY_MS, WS_MAX_RECONNECT_ATTEMPTS } from "@/lib/constants";

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleWSEvent = useETLStore((s) => s.handleWSEvent);
  const handleWSEventRef = useRef(handleWSEvent);

  useEffect(() => {
    handleWSEventRef.current = handleWSEvent;
  }, [handleWSEvent]);

  useEffect(() => {
    let allowReconnect = true;

    const disconnect = () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      wsRef.current?.close();
      wsRef.current = null;
    };

    const connect = () => {
      if (!allowReconnect) return;

      const readyState = wsRef.current?.readyState;
      if (readyState === WebSocket.OPEN || readyState === WebSocket.CONNECTING) return;

      try {
        const ws = new WebSocket(`${WS_BASE_URL}/ws/etl`);
        wsRef.current = ws;

        ws.onopen = () => {
          reconnectCount.current = 0;
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleWSEventRef.current(data);
          } catch {
            // Ignore malformed messages
          }
        };

        ws.onclose = () => {
          wsRef.current = null;
          if (allowReconnect && reconnectCount.current < WS_MAX_RECONNECT_ATTEMPTS) {
            const delay = WS_RECONNECT_DELAY_MS * Math.pow(2, reconnectCount.current);
            reconnectCount.current++;
            reconnectTimer.current = setTimeout(connect, delay);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        // Connection failed, will retry via onclose
      }
    };

    connect();

    return () => {
      allowReconnect = false;
      reconnectCount.current = WS_MAX_RECONNECT_ATTEMPTS;
      disconnect();
    };
  }, []);
}
