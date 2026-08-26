import { Component, OnInit } from '@angular/core';
import { of } from 'rxjs';
import { AlertService } from '../../../core/services/alert.service';
import { SHIMMER_MS, withShimmerDelay } from '../../../core/utils/shimmer';

type Cadence = 'daily' | 'weekly' | 'biweekly' | 'monthly';

interface SavedReportSchedule {
  cadence: Cadence;
  savedAt: string;
}

const SCHEDULE_KEY = 'nb.manager.reportSchedule';

@Component({
  selector: 'app-manager-reports',
  templateUrl: './manager-reports.component.html',
  styleUrls: ['./manager-shared.scss']
})
export class ManagerReportsComponent implements OnInit {
  pageLoading = true;
  saving = false;
  cadence: Cadence = 'weekly';
  saved: SavedReportSchedule | null = null;

  readonly cadenceOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Bi-weekly' },
    { value: 'monthly', label: 'Monthly' }
  ];

  constructor(private readonly alerts: AlertService) {}

  ngOnInit(): void {
    this.saved = this.readSaved();
    if (this.saved?.cadence) {
      this.cadence = this.saved.cadence;
    }
    withShimmerDelay(of(true), SHIMMER_MS).subscribe(() => {
      this.pageLoading = false;
    });
  }

  get cadenceLabel(): string {
    return this.cadenceOptions.find((o) => o.value === this.cadence)?.label || this.cadence;
  }

  get savedCadenceLabel(): string {
    if (!this.saved?.cadence) {
      return '';
    }
    return this.cadenceOptions.find((o) => o.value === this.saved?.cadence)?.label || this.saved.cadence;
  }

  async schedule(): Promise<void> {
    if (this.saving) {
      return;
    }
    this.saving = true;
    const payload: SavedReportSchedule = {
      cadence: this.cadence,
      savedAt: new Date().toISOString()
    };
    withShimmerDelay(of(payload), SHIMMER_MS).subscribe({
      next: async (next) => {
        try {
          localStorage.setItem(SCHEDULE_KEY, JSON.stringify(next));
          this.saved = next;
          this.saving = false;
          await this.alerts.success(
            `Report schedule preview saved as ${this.cadenceLabel}. End result appears in Saved schedule below until email/desk delivery is wired.`
          );
        } catch {
          this.saving = false;
          await this.alerts.error('Unable to save schedule preview on this device.');
        }
      },
      error: async () => {
        this.saving = false;
        await this.alerts.error('Unable to save schedule preview.');
      }
    });
  }

  clearSaved(): void {
    localStorage.removeItem(SCHEDULE_KEY);
    this.saved = null;
  }

  private readSaved(): SavedReportSchedule | null {
    try {
      const raw = localStorage.getItem(SCHEDULE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as SavedReportSchedule;
      if (!parsed?.cadence || !parsed?.savedAt) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }
}
