import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AlertService } from '../../../core/services/alert.service';
import { BillingService } from '../../../core/services/billing.service';
import { SHIMMER_MS, withShimmerDelay } from '../../../core/utils/shimmer';

export type BulkKind = 'products' | 'customers';

export interface BulkPreviewRow {
  id: string;
  selected: boolean;
  raw: Record<string, string | number>;
  localError?: string;
}

type BulkStep = 'import' | 'preview' | 'uploading' | 'result';

@Component({
  selector: 'app-billing-bulk-upload',
  templateUrl: './billing-bulk-upload.component.html',
  styleUrls: ['./billing-bulk-upload.component.scss']
})
export class BillingBulkUploadComponent implements OnChanges {
  @Input() open = false;
  @Input() kind: BulkKind = 'products';

  @Output() closed = new EventEmitter<void>();
  @Output() completed = new EventEmitter<{ createdCount: number }>();

  leaving = false;
  step: BulkStep = 'import';
  pasteText = '';
  rows: BulkPreviewRow[] = [];
  page = 1;
  readonly pageSize = 8;
  uploading = false;
  bootShimmer = false;
  previewShimmer = false;
  resultMessage = '';
  resultCreated = 0;
  resultErrors: Array<{ index: number; message: string }> = [];
  private leaveTimer: ReturnType<typeof setTimeout> | null = null;
  private previewTimer: ReturnType<typeof setTimeout> | null = null;
  private idSeq = 0;

  constructor(
    private readonly billing: BillingService,
    private readonly alerts: AlertService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.reset();
      this.bootShimmer = true;
      setTimeout(() => {
        this.bootShimmer = false;
      }, 320);
    }
  }

  get title(): string {
    return this.kind === 'products' ? 'Bulk upload products' : 'Bulk upload customers';
  }

  get hint(): string {
    return this.kind === 'products'
      ? 'CSV columns: name, sku, price, stock, gstPercentage, category'
      : 'CSV columns: name, email, phone, address, bankingAccountNumber';
  }

  get sample(): string {
    return this.kind === 'products'
      ? 'Coffee Beans,SKU-100,12.5,40,18,Grocery\nGreen Tea,SKU-101,8,25,5,Grocery'
      : 'Ada Lovelace,ada@example.com,555-0100,12 Analytical Way,NB-1001\nGrace Hopper,grace@example.com,555-0101,1 Cobol Street,';
  }

  get selectedCount(): number {
    return this.rows.filter((r) => r.selected).length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.rows.length / this.pageSize));
  }

  get pagedRows(): BulkPreviewRow[] {
    const start = (this.page - 1) * this.pageSize;
    return this.rows.slice(start, start + this.pageSize);
  }

  get allPageSelected(): boolean {
    return this.pagedRows.length > 0 && this.pagedRows.every((r) => r.selected);
  }

  close(): void {
    if (this.leaving || this.uploading) {
      return;
    }
    this.leaving = true;
    this.leaveTimer = setTimeout(() => {
      this.leaving = false;
      this.reset();
      this.closed.emit();
    }, 200);
  }

  useSample(): void {
    this.pasteText = this.sample;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.pasteText = String(reader.result || '');
    };
    reader.readAsText(file);
    input.value = '';
  }

  buildPreview(): void {
    const parsed = this.parseCsv(this.pasteText);
    if (!parsed.length) {
      void this.alerts.error('Paste or upload at least one data row.');
      return;
    }
    this.previewShimmer = true;
    this.step = 'preview';
    this.page = 1;
    if (this.previewTimer) {
      clearTimeout(this.previewTimer);
    }
    this.previewTimer = setTimeout(() => {
      this.rows = parsed.map((raw) => ({
        id: `row-${++this.idSeq}`,
        selected: true,
        raw,
        localError: this.localValidate(raw)
      }));
      this.previewShimmer = false;
      this.previewTimer = null;
    }, 420);
  }

  togglePage(select: boolean): void {
    this.pagedRows.forEach((r) => {
      r.selected = select;
    });
  }

  toggleRow(row: BulkPreviewRow): void {
    row.selected = !row.selected;
  }

  removeRow(row: BulkPreviewRow): void {
    this.rows = this.rows.filter((r) => r.id !== row.id);
    if (this.page > this.totalPages) {
      this.page = this.totalPages;
    }
  }

  removeSelected(): void {
    this.rows = this.rows.filter((r) => !r.selected);
    if (!this.rows.length) {
      this.step = 'import';
      return;
    }
    if (this.page > this.totalPages) {
      this.page = this.totalPages;
    }
  }

  goPage(delta: number): void {
    this.page = Math.min(this.totalPages, Math.max(1, this.page + delta));
  }

  backToImport(): void {
    this.step = 'import';
  }

  async uploadSelected(): Promise<void> {
    const items = this.rows.filter((r) => r.selected).map((r) => r.raw);
    if (!items.length) {
      await this.alerts.error('Select at least one row to upload.');
      return;
    }
    this.step = 'uploading';
    this.uploading = true;
    try {
      const res =
        this.kind === 'products'
          ? await firstValueFrom(withShimmerDelay(this.billing.bulkCreateProducts(items), SHIMMER_MS))
          : await firstValueFrom(withShimmerDelay(this.billing.bulkCreateCustomers(items), SHIMMER_MS));
      this.resultCreated = res.createdCount || (res.created || []).length;
      this.resultErrors = res.errors || [];
      this.resultMessage = res.message || 'Upload finished';
      this.step = 'result';
      if (this.resultCreated > 0) {
        await this.alerts.toastSuccessCorner('Bulk upload', this.resultMessage);
        this.completed.emit({ createdCount: this.resultCreated });
      } else {
        await this.alerts.error(this.resultMessage);
      }
    } catch (err) {
      this.resultCreated = 0;
      this.resultErrors = [];
      this.resultMessage =
        (err as { error?: { message?: string } })?.error?.message || 'Bulk upload failed.';
      this.step = 'result';
      await this.alerts.error(this.resultMessage);
    } finally {
      this.uploading = false;
    }
  }

  finish(): void {
    this.reset();
    this.closed.emit();
  }

  displayValue(row: BulkPreviewRow, key: string): string {
    const value = row.raw[key];
    return value == null || value === '' ? '—' : String(value);
  }

  private reset(): void {
    this.leaving = false;
    this.step = 'import';
    this.pasteText = '';
    this.rows = [];
    this.page = 1;
    this.uploading = false;
    this.previewShimmer = false;
    this.resultMessage = '';
    this.resultCreated = 0;
    this.resultErrors = [];
    if (this.previewTimer) {
      clearTimeout(this.previewTimer);
      this.previewTimer = null;
    }
  }

  private localValidate(raw: Record<string, string | number>): string | undefined {
    if (this.kind === 'products') {
      const name = String(raw['name'] || '').trim();
      const price = Number(raw['price']);
      const stock = Number(raw['stock']);
      if (!name) return 'Name required';
      if (Number.isNaN(price) || price < 0) return 'Invalid price';
      if (Number.isNaN(stock) || stock < 0) return 'Invalid stock';
      return undefined;
    }
    const name = String(raw['name'] || '').trim();
    if (!name) return 'Name required';
    return undefined;
  }

  private parseCsv(text: string): Array<Record<string, string | number>> {
    const lines = String(text || '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) {
      return [];
    }

    const productHeaders = ['name', 'sku', 'price', 'stock', 'gstPercentage', 'category'];
    const customerHeaders = ['name', 'email', 'phone', 'address', 'bankingAccountNumber'];
    const headers = this.kind === 'products' ? productHeaders : customerHeaders;

    let start = 0;
    const firstCells = this.splitCsvLine(lines[0]).map((c) => c.toLowerCase());
    if (firstCells.some((c) => headers.includes(c))) {
      start = 1;
    }

    const rows: Array<Record<string, string | number>> = [];
    for (let i = start; i < lines.length; i += 1) {
      const cells = this.splitCsvLine(lines[i]);
      if (!cells.some((c) => c.trim())) {
        continue;
      }
      const row: Record<string, string | number> = {};
      headers.forEach((key, idx) => {
        const raw = (cells[idx] || '').trim();
        if (this.kind === 'products' && (key === 'price' || key === 'stock' || key === 'gstPercentage')) {
          row[key] = raw === '' ? (key === 'gstPercentage' ? 18 : 0) : Number(raw);
        } else {
          row[key] = raw;
        }
      });
      rows.push(row);
    }
    return rows;
  }

  private splitCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (ch === ',' && !inQuotes) {
        out.push(cur);
        cur = '';
        continue;
      }
      cur += ch;
    }
    out.push(cur);
    return out;
  }
}
