import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-bank-card',
  templateUrl: './bank-card.component.html',
  styleUrls: ['./bank-card.component.scss']
})
export class BankCardComponent {
  @Input() holderName = 'CARD HOLDER';
  @Input() number = '';
  @Input() expiryMonth = 'MM';
  @Input() expiryYear = 'YY';
  @Input() cvv = '';
  @Input() flipped = false;
  @Input() brand = 'NovaBank';

  get displayNumber(): string {
    const digits = String(this.number || '').replace(/\D/g, '').padEnd(16, '•').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  }

  get displayExpiry(): string {
    const mm = (this.expiryMonth || 'MM').toString().padStart(2, '0').slice(0, 2);
    const yy = (this.expiryYear || 'YY').toString().slice(-2).padStart(2, 'Y');
    return `${mm}/${yy}`;
  }

  get displayCvv(): string {
    const raw = String(this.cvv || '');
    if (!raw) {
      return '•••';
    }
    return raw.padEnd(3, '•').slice(0, 3);
  }

  get displayName(): string {
    return (this.holderName || 'CARD HOLDER').toUpperCase();
  }
}
