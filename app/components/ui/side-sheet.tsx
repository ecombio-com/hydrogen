import {X} from 'lucide-react';
import {useEffect, useRef, type ReactNode} from 'react';

const COPY = {close: 'Close'};

// Right-side panel (full-width bottom sheet on mobile), Back Market style. Built on the native
// <dialog>: focus stays inside, Esc closes, the page behind can't be clicked. Click outside closes.
export function SideSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    document.documentElement.style.overflow = open ? 'hidden' : '';
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-0 mt-auto h-[90dvh] max-h-dvh w-full max-w-none bg-background p-0 text-foreground backdrop:bg-black/40 md:ml-auto md:mt-0 md:h-dvh md:w-[380px] md:rounded-l-lg"
    >
      <div className="flex h-full flex-col">
        <div className="relative mx-6 mt-4 flex items-center justify-center border-b border-border px-10 pt-2 pb-5 text-center">
          <h2 className="text-ds-regular text-foreground">{title}</h2>
          <button
            type="button"
            aria-label={COPY.close}
            onClick={onClose}
            className="absolute top-0 right-0 flex size-10 cursor-pointer items-center justify-center rounded-full hover:bg-muted"
          >
            <X className="size-6" aria-hidden />
          </button>
        </div>
        <div className="flex-auto overflow-auto p-6" tabIndex={0}>
          {children}
        </div>
      </div>
    </dialog>
  );
}
