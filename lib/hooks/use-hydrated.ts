"use client";

import { useEffect, useState } from "react";

/** True after the component has mounted on the client (safe for wallet/theme UI). */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}
