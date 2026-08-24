import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon, SweetAlertResult } from 'sweetalert2';
import { firstValueFrom, isObservable, Observable } from 'rxjs';

/** Shared modal titles across the app */
export const ALERT_TITLES = {
  success: 'Success',
  error: 'Error',
  warning: 'Warning',
  info: 'Notice',
  confirm: 'Confirm'
} as const;

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private readonly theme = {
    confirmButtonColor: '#5fc4b0',
    cancelButtonColor: '#94a3b8',
    background: '#f7fbfe',
    color: '#1d2a36'
  };

  /** Bootstrap-equivalent static backdrop: no outside click / Escape dismiss. */
  private readonly staticBackdrop = {
    allowOutsideClick: false as const,
    allowEscapeKey: false as const,
    didOpen: (popup: HTMLElement) => {
      popup.setAttribute('data-backdrop', 'static');
      popup.setAttribute('data-keyboard', 'false');
      popup.setAttribute('tabindex', '-1');
    }
  };

  private readonly alertClasses = {
    popup: 'nb-alert',
    confirmButton: 'nb-alert__confirm',
    cancelButton: 'nb-alert__cancel',
    title: 'nb-alert__title',
    htmlContainer: 'nb-alert__text'
  };

  /** Top-center success toast (general app feedback). */
  toastSuccess(title: string, text?: string): Promise<SweetAlertResult> {
    return this.fireToast('success', 'top', title, text, 'nb-toast--success');
  }

  toastError(title: string, text?: string): Promise<SweetAlertResult> {
    return this.fireToast('error', 'top', title, text, 'nb-toast--error');
  }

  /** Top-center themed warning toast (empty search / filter guards). */
  toastWarning(title: string, text?: string): Promise<SweetAlertResult> {
    return this.fireToast('warning', 'top', title, text, 'nb-toast--warning');
  }

  /** Top-right corner success toast (login / signup welcome). */
  toastSuccessCorner(title: string, text?: string): Promise<SweetAlertResult> {
    return this.fireToast('success', 'top-end', title, text, 'nb-toast--success nb-toast--corner');
  }

  private fireToast(
    icon: SweetAlertIcon,
    position: 'top' | 'top-end',
    title: string,
    text: string | undefined,
    toneClass: string
  ): Promise<SweetAlertResult> {
    const isCorner = toneClass.includes('nb-toast--corner');
    return Swal.fire({
      toast: true,
      position,
      icon,
      title,
      text,
      showConfirmButton: false,
      showCloseButton: false,
      timer: 5000,
      timerProgressBar: false,
      background: this.theme.background,
      color: this.theme.color,
      width: isCorner ? undefined : 'auto',
      customClass: {
        popup: `nb-toast ${toneClass}`,
        title: 'nb-toast__title',
        htmlContainer: 'nb-toast__text'
      },
      didOpen: (popup) => {
        if (!isCorner) {
          return;
        }
        // Grow login toast to the rendered message length (SweetAlert2 defaults to ~360px).
        const titleEl = popup.querySelector('.swal2-title') as HTMLElement | null;
        const textEl = popup.querySelector('.swal2-html-container') as HTMLElement | null;
        const iconEl = popup.querySelector('.swal2-icon') as HTMLElement | null;
        const titleW = titleEl?.scrollWidth || 0;
        const textW = textEl?.scrollWidth || 0;
        const iconW = iconEl ? iconEl.offsetWidth + 12 : 0;
        const contentW = Math.max(titleW, textW) + iconW + 28;
        popup.style.setProperty('width', `${Math.min(contentW, window.innerWidth - 24)}px`, 'important');
        popup.style.setProperty('max-width', 'min(42rem, calc(100vw - 1.5rem))', 'important');
      }
    });
  }

  success(text?: string, title: string = ALERT_TITLES.success): Promise<SweetAlertResult> {
    return Swal.fire({
      icon: 'success',
      title,
      text,
      confirmButtonText: 'Continue',
      ...this.theme,
      ...this.staticBackdrop,
      customClass: this.alertClasses
    });
  }

  error(text?: string): Promise<SweetAlertResult> {
    return Swal.fire({
      icon: 'error',
      title: ALERT_TITLES.error,
      text,
      confirmButtonText: 'OK',
      confirmButtonColor: '#c45b6c',
      background: this.theme.background,
      color: this.theme.color,
      ...this.staticBackdrop,
      customClass: {
        ...this.alertClasses,
        confirmButton: 'nb-alert__confirm nb-alert__confirm--danger'
      }
    });
  }

  warning(text?: string): Promise<SweetAlertResult> {
    return Swal.fire({
      icon: 'warning',
      title: ALERT_TITLES.warning,
      text,
      confirmButtonText: 'OK',
      confirmButtonColor: '#d4a017',
      background: this.theme.background,
      color: this.theme.color,
      ...this.staticBackdrop,
      customClass: this.alertClasses
    });
  }

  info(text?: string, title: string = ALERT_TITLES.info): Promise<SweetAlertResult> {
    return Swal.fire({
      icon: 'info',
      title,
      text,
      confirmButtonText: 'OK',
      ...this.theme,
      ...this.staticBackdrop,
      customClass: this.alertClasses
    });
  }

  /** Info modal with a secondary navigation action (e.g. Check status). */
  async infoWithAction(options: {
    title?: string;
    text?: string;
    confirmText?: string;
    cancelText?: string;
    actionHint?: string;
  }): Promise<boolean> {
    const result = await Swal.fire({
      icon: 'info',
      title: options.title || ALERT_TITLES.info,
      html: `
        <p class="nb-alert__text">${options.text || ''}</p>
        ${
          options.actionHint
            ? `<p class="nb-alert__hint" style="margin:0.85rem 0 0;color:#5f7a8c;font-size:0.92rem;">${options.actionHint}</p>`
            : ''
        }
      `,
      showCancelButton: true,
      confirmButtonText: options.confirmText || 'Continue',
      cancelButtonText: options.cancelText || 'Close',
      reverseButtons: true,
      ...this.theme,
      ...this.staticBackdrop,
      customClass: this.alertClasses
    });
    return !!result.isConfirmed;
  }

  confirm(options: {
    text?: string;
    confirmText?: string;
    cancelText?: string;
    icon?: SweetAlertIcon;
  }): Promise<boolean> {
    return Swal.fire({
      icon: options.icon || 'question',
      title: ALERT_TITLES.confirm,
      text: options.text,
      showCancelButton: true,
      confirmButtonText: options.confirmText || 'Confirm',
      cancelButtonText: options.cancelText || 'Cancel',
      reverseButtons: true,
      ...this.theme,
      ...this.staticBackdrop,
      customClass: this.alertClasses
    }).then((result) => !!result.isConfirmed);
  }

  /**
   * Confirm → loading spinner in the same modal → success/error in the same modal.
   */
  async confirmAction<T>(options: {
    text?: string;
    confirmText?: string;
    cancelText?: string;
    loadingText?: string;
    icon?: SweetAlertIcon;
    action: () => Observable<T> | Promise<T>;
    successMessage?: string | ((result: T) => string);
    errorMessage?: string | ((err: unknown) => string);
  }): Promise<{ ok: true; result: T } | { ok: false; cancelled?: boolean; error?: unknown }> {
    const confirmed = await this.confirm({
      text: options.text,
      confirmText: options.confirmText,
      cancelText: options.cancelText,
      icon: options.icon
    });

    if (!confirmed) {
      return { ok: false, cancelled: true };
    }

    void Swal.fire({
      title: ALERT_TITLES.confirm,
      text: options.loadingText || 'Please wait…',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      ...this.theme,
      customClass: this.alertClasses,
      didOpen: (popup) => {
        popup.setAttribute('data-backdrop', 'static');
        popup.setAttribute('data-keyboard', 'false');
        popup.setAttribute('tabindex', '-1');
        Swal.showLoading();
      }
    });

    try {
      const pending = options.action();
      const result = isObservable(pending) ? await firstValueFrom(pending) : await pending;
      const message =
        typeof options.successMessage === 'function'
          ? options.successMessage(result)
          : options.successMessage || 'Done.';

      await Swal.fire({
        icon: 'success',
        title: ALERT_TITLES.success,
        text: message,
        confirmButtonText: 'Continue',
        ...this.theme,
        ...this.staticBackdrop,
        customClass: this.alertClasses
      });

      return { ok: true, result };
    } catch (error) {
      const message =
        typeof options.errorMessage === 'function'
          ? options.errorMessage(error)
          : options.errorMessage || this.readErrorMessage(error);

      await Swal.fire({
        icon: 'error',
        title: ALERT_TITLES.error,
        text: message,
        confirmButtonText: 'OK',
        confirmButtonColor: '#c45b6c',
        background: this.theme.background,
        color: this.theme.color,
        ...this.staticBackdrop,
        customClass: {
          ...this.alertClasses,
          confirmButton: 'nb-alert__confirm nb-alert__confirm--danger'
        }
      });

      return { ok: false, error };
    }
  }

  private readErrorMessage(error: unknown): string {
    const err = error as { error?: { message?: string }; message?: string };
    return err?.error?.message || err?.message || 'Something went wrong.';
  }
}
