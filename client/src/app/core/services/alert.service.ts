import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon, SweetAlertResult } from 'sweetalert2';

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

  success(title: string, text?: string): Promise<SweetAlertResult> {
    return Swal.fire({
      icon: 'success',
      title,
      text,
      confirmButtonText: 'Continue',
      ...this.theme,
      customClass: {
        popup: 'nb-alert',
        confirmButton: 'nb-alert__confirm',
        title: 'nb-alert__title',
        htmlContainer: 'nb-alert__text'
      }
    });
  }

  error(title: string, text?: string): Promise<SweetAlertResult> {
    return Swal.fire({
      icon: 'error',
      title,
      text,
      confirmButtonText: 'OK',
      confirmButtonColor: '#c45b6c',
      background: this.theme.background,
      color: this.theme.color,
      customClass: {
        popup: 'nb-alert',
        confirmButton: 'nb-alert__confirm nb-alert__confirm--danger',
        title: 'nb-alert__title',
        htmlContainer: 'nb-alert__text'
      }
    });
  }

  info(title: string, text?: string): Promise<SweetAlertResult> {
    return Swal.fire({
      icon: 'info',
      title,
      text,
      confirmButtonText: 'OK',
      ...this.theme,
      customClass: {
        popup: 'nb-alert',
        confirmButton: 'nb-alert__confirm',
        title: 'nb-alert__title',
        htmlContainer: 'nb-alert__text'
      }
    });
  }

  confirm(options: {
    title: string;
    text?: string;
    confirmText?: string;
    cancelText?: string;
    icon?: SweetAlertIcon;
  }): Promise<boolean> {
    return Swal.fire({
      icon: options.icon || 'question',
      title: options.title,
      text: options.text,
      showCancelButton: true,
      confirmButtonText: options.confirmText || 'Confirm',
      cancelButtonText: options.cancelText || 'Cancel',
      reverseButtons: true,
      ...this.theme,
      customClass: {
        popup: 'nb-alert',
        confirmButton: 'nb-alert__confirm',
        cancelButton: 'nb-alert__cancel',
        title: 'nb-alert__title',
        htmlContainer: 'nb-alert__text'
      }
    }).then((result) => !!result.isConfirmed);
  }
}
