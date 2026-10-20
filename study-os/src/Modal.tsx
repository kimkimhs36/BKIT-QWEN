import { useRef, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
/** Focus trapping, Escape, scroll locking and focus restoration are owned by Radix. */
export function Modal({
  title,
  children,
  onClose,
  nonModal = false,
  returnFocus,
  className = '',
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  nonModal?: boolean;
  returnFocus?: HTMLElement | null;
  className?: string;
}) {
  const returnTo = useRef(
    returnFocus ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null),
  );
  return (
    <Dialog.Root
      open
      modal={!nonModal}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        {!nonModal && <Dialog.Overlay className="study-dialog-overlay" />}
        <Dialog.Content
          id={nonModal ? 'bkit-tools-menu' : undefined}
          className={(nonModal ? 'study-dialog tools-dialog' : 'study-dialog') + ' ' + className}
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const target = nonModal
              ? document.querySelector<HTMLButtonElement>('.home-tools-button')
              : returnTo.current;
            if (target?.isConnected) target.focus({ preventScroll: true });
          }}
          onInteractOutside={(event) => {
            if (
              nonModal &&
              event.target instanceof Element &&
              event.target.closest('.home-tools-button')
            )
              event.preventDefault();
          }}
        >
          <div className="modal-head">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button className="icon-button" aria-label="닫기">
                <X size={21} />
              </button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
