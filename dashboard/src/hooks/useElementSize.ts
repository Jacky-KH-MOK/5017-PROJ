import { useEffect, useRef, useState } from "react";

type Size = { width: number; height: number };

export function useElementSize<T extends HTMLElement>(): [React.RefObject<T>, Size] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });

    observer.observe(element);
    setSize({ width: element.clientWidth, height: element.clientHeight });

    return () => observer.disconnect();
  }, []);

  return [ref, size];
}
