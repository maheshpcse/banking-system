import { Component, Input } from '@angular/core';
import { CardBrand } from '../../core/models/banking.models';

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
  @Input() brand: CardBrand | string = 'visa';
  /** When true, PAN/CVV use reveal controls instead of always showing */
  @Input() secure = true;

  get brandKey(): string {
    const raw = String(this.brand || 'visa').toLowerCase();
    if (['visa', 'mastercard', 'amex', 'discover', 'novabank'].includes(raw)) {
      return raw;
    }
    return 'visa';
  }

  get brandLabel(): string {
    switch (this.brandKey) {
      case 'mastercard':
        return 'Mastercard';
      case 'amex':
        return 'American Express';
      case 'discover':
        return 'Discover';
      case 'novabank':
        return 'NovaBank';
      default:
        return 'Visa';
    }
  }

  get displayName(): string {
    return (this.holderName || 'CARD HOLDER').toUpperCase();
  }

  get displayExpiry(): string {
    const mm = (this.expiryMonth || 'MM').toString().padStart(2, '0').slice(0, 2);
    const yy = (this.expiryYear || 'YY').toString().slice(-2).padStart(2, 'Y');
    return `${mm}/${yy}`;
  }

  get rawNumber(): string {
    return String(this.number || '').replace(/\D/g, '');
  }

  get rawCvv(): string {
    return String(this.cvv || '').replace(/\D/g, '');
  }
}
