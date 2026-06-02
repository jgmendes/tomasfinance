"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

type ConfirmFn = (options?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [options, setOptions] = React.useState<ConfirmOptions>({});
  const resolver = React.useRef<(value: boolean) => void>();

  const confirm = React.useCallback<ConfirmFn>((opts) => {
    setOptions(opts ?? {});
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function handle(result: boolean) {
    setOpen(false);
    resolver.current?.(result);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={open} onOpenChange={(o) => !o && handle(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{options.title ?? "Tem certeza?"}</DialogTitle>
            <DialogDescription>
              {options.description ?? "Esta ação não pode ser desfeita."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => handle(false)}>
              {options.cancelText ?? "Cancelar"}
            </Button>
            <Button
              variant={options.destructive === false ? "default" : "destructive"}
              onClick={() => handle(true)}
            >
              {options.confirmText ?? "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) {
    // Fallback seguro caso usado fora do provider.
    return async (opts) =>
      typeof window !== "undefined"
        ? window.confirm(opts?.description ?? "Tem certeza?")
        : false;
  }
  return ctx;
}
