import { useEffect } from "react";

export function useSse(url: string, onEvent: (event: string, payload: any) => void) {
  useEffect(() => {
    const source = new EventSource(url);
    source.onmessage = (message) => {
      try {
        const parsed = JSON.parse(message.data);
        onEvent(parsed.event ?? "message", parsed.payload);
      } catch (error) {
        console.error("[SSE] failed to parse event", error);
      }
    };
    return () => {
      source.close();
    };
  }, [url, onEvent]);
}

