import { createContext, useContext, useEffect } from "react";

/**
 * The dialog's busy hook-point (AC-09): the detail body reports «unsaved comment / typed tag text / delete
 * confirmation open» with `useReportDialogBusy(busy)`; while true, stepping is unavailable. Outside a dialog it is a no-op.
 */
export const DialogBusyContext = createContext<(busy: boolean) => void>(() => {});

export function useReportDialogBusy(busy: boolean) {
  const report = useContext(DialogBusyContext);
  useEffect(() => {
    report(busy);
    return () => report(false);
  }, [busy, report]);
}
