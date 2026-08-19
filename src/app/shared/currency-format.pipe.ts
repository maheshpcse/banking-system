import { Pipe, PipeTransform } from '@angular/core';
import { AuthService } from '../core/services/auth.service';

@Pipe({ name: 'currencyFormat' })
export class CurrencyFormatPipe implements PipeTransform {
  constructor(private readonly auth: AuthService) {}

  transform(value: number | null | undefined, currency?: string): string {
    const code = (currency || this.auth.preferredCurrency()).toUpperCase();
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: code,
        minimumFractionDigits: 2
      }).format(Number(value ?? 0));
    } catch {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
      }).format(Number(value ?? 0));
    }
  }
}
