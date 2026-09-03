"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function useRealtimeTable(
  table: string,
  onChange: () => void,
  deps: unknown[] = []
) {
  useEffect(() => {
    const channel = supabase
      .channel(`realtime-${table}-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => onChange()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, ...deps]);
}

export function useRealtimeTables(
  tables: string[],
  onChange: () => void,
  deps: unknown[] = []
) {
  useEffect(() => {
    const channelName = `realtime-multi-${tables.join("-")}-${Date.now()}`;
    let channel = supabase.channel(channelName);

    for (const table of tables) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => onChange()
      );
    }

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.join(","), ...deps]);
}
