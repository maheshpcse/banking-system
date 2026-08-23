import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  HostListener,
  Input,
  Output
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface ThemeSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-theme-select',
  templateUrl: './theme-select.component.html',
  styleUrls: ['./theme-select.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ThemeSelectComponent),
      multi: true
    }
  ]
})
export class ThemeSelectComponent implements ControlValueAccessor {
  @Input() options: ThemeSelectOption[] = [];
  @Input() placeholder = 'Select…';
  @Input() ariaLabel = '';
  @Input() name = '';
  /** Extra class on the control (e.g. input--select for compact toolbars). */
  @Input() controlClass = '';
  /** Show a Presence-style clear “×” when a value is selected. */
  @Input() clearable = false;

  @Output() opened = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();
  @Output() valueChange = new EventEmitter<string>();
  @Output() cleared = new EventEmitter<void>();

  open = false;
  menuMounted = false;
  disabled = false;
  value = '';

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private leaveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly host: ElementRef<HTMLElement>,
    private readonly cdr: ChangeDetectorRef
  ) {}

  get selectedLabel(): string {
    const match = this.options.find((o) => o.value === this.value);
    if (match) {
      return match.label;
    }
    return this.placeholder;
  }

  get hasValue(): boolean {
    return this.value !== '' && this.value != null;
  }

  writeValue(value: string | null): void {
    this.value = value == null ? '' : String(value);
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }

  toggle(): void {
    if (this.disabled) {
      return;
    }
    if (this.open) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  openMenu(): void {
    if (this.disabled || this.open) {
      return;
    }
    if (this.leaveTimer) {
      clearTimeout(this.leaveTimer);
      this.leaveTimer = null;
    }
    this.menuMounted = true;
    this.open = true;
    this.opened.emit();
    this.onTouched();
  }

  closeMenu(): void {
    if (!this.open && !this.menuMounted) {
      return;
    }
    this.open = false;
    this.closed.emit();
    if (this.leaveTimer) {
      clearTimeout(this.leaveTimer);
    }
    this.leaveTimer = setTimeout(() => {
      if (!this.open) {
        this.menuMounted = false;
      }
      this.leaveTimer = null;
      this.cdr.markForCheck();
    }, 180);
  }

  pick(option: ThemeSelectOption, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (option.disabled || this.disabled) {
      return;
    }
    this.value = option.value;
    this.onChange(this.value);
    this.valueChange.emit(this.value);
    this.closeMenu();
  }

  clear(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled) {
      return;
    }
    this.value = '';
    this.onChange(this.value);
    this.valueChange.emit(this.value);
    this.cleared.emit();
    this.closeMenu();
    this.onTouched();
  }

  trackByValue(_: number, option: ThemeSelectOption): string {
    return option.value;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open) {
      return;
    }
    const target = event.target as Node | null;
    if (target && !this.host.nativeElement.contains(target)) {
      this.closeMenu();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) {
      this.closeMenu();
    }
  }
}
