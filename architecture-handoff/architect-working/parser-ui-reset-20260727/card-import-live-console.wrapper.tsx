"use client";

import { useEffect, useState } from "react";
import {
  CARD_IMPORT_CLEAR_EVENT,
  CARD_IMPORT_LIVE_EVENT,
  type CardImportLiveEventDetail,
} from "@/lib/finance/card-import-api";
import { CardImportLiveConsole as BaseCardImportLiveConsole } from "./card-import-live-console.base";

export function CardImportLiveConsole() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onClear = () => setVisible(false);
    const onLiveEvent = (event: Event) => {
      const detail = (event as CustomEvent<CardImportLiveEventDetail>).detail;
      if (detail?.type === "reset" && detail.fileName.trim()) {
        setVisible(true);
      }
    };

    window.addEventListener(CARD_IMPORT_CLEAR_EVENT, onClear);
    window.addEventListener(CARD_IMPORT_LIVE_EVENT, onLiveEvent);
    return () => {
      window.removeEventListener(CARD_IMPORT_CLEAR_EVENT, onClear);
      window.removeEventListener(CARD_IMPORT_LIVE_EVENT, onLiveEvent);
    };
  }, []);

  return (
    <div className={visible ? "contents" : "hidden"} aria-hidden={!visible}>
      <BaseCardImportLiveConsole />
    </div>
  );
}
