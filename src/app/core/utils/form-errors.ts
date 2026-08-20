import { AbstractControl } from '@angular/forms';

/**
 * Field-level message under a control.
 * Only after the user has touched the field — never on pristine load / autofill dirty alone.
 */
export function fieldError(control: AbstractControl | null | undefined, label: string): string {
  if (!control || !control.touched || control.valid) {
    return '';
  }

  if (control.hasError('required')) {
    return `${label} is required.`;
  }
  if (control.hasError('email')) {
    return 'Enter a valid email address.';
  }
  if (control.hasError('minlength')) {
    const requiredLength = control.getError('minlength')?.requiredLength;
    return `${label} must be at least ${requiredLength} characters.`;
  }
  if (control.hasError('maxlength')) {
    const requiredLength = control.getError('maxlength')?.requiredLength;
    return `${label} must be at most ${requiredLength} characters.`;
  }
  if (control.hasError('min')) {
    const min = control.getError('min')?.min;
    return `${label} must be at least ${min}.`;
  }
  if (control.hasError('username')) {
    return '3–32 characters: letters, numbers, dots, underscores, hyphens.';
  }
  if (control.hasError('mismatch')) {
    return 'Passwords do not match.';
  }
  if (control.hasError('pattern')) {
    return `${label} is invalid.`;
  }

  return `${label} is invalid.`;
}
