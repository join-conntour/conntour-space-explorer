import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, ms = 500) {
  const [returnValue, setReturnValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setReturnValue(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);

  return returnValue;
}
