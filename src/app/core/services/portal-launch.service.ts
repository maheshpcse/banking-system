import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';

export type PortalLaunchTarget = 'billing' | 'banking' | 'shop' | 'billing-desk';

@Injectable({ providedIn: 'root' })
export class PortalLaunchService {
  private readonly active$ = new BehaviorSubject<{
    target: PortalLaunchTarget;
    progress: number;
  } | null>(null);

  readonly launchState$ = this.active$.asObservable();

  private timer: ReturnType<typeof setInterval> | null = null;
  private finishTimer: ReturnType<typeof setTimeout> | null = null;
  private navigating = false;

  constructor(private readonly router: Router) {}

  get isLaunching(): boolean {
    return this.active$.value != null;
  }

  /** Manager/Admin handoff overlay (~1.6s) then navigate. */
  launch(target: PortalLaunchTarget, url: string): void {
    if (this.isLaunching || this.navigating) {
      return;
    }
    this.clearTimers();
    this.navigating = false;
    this.active$.next({ target, progress: 1 });

    const durationMs = 1600;
    const started = Date.now();
    this.timer = setInterval(() => {
      const elapsed = Date.now() - started;
      const progress = Math.min(100, Math.max(1, Math.round((elapsed / durationMs) * 100)));
      const current = this.active$.value;
      if (current) {
        this.active$.next({ ...current, progress });
      }
      // Only stop the ticker — do not clear finishTimer (that would cancel navigation).
      if (progress >= 100 && this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    }, 30);

    this.finishTimer = setTimeout(() => {
      this.finishTimer = null;
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
      const current = this.active$.value;
      if (current) {
        this.active$.next({ ...current, progress: 100 });
      }
      this.navigating = true;
      void this.router
        .navigateByUrl(url)
        .catch(() => undefined)
        .finally(() => {
          this.navigating = false;
          this.active$.next(null);
        });
    }, durationMs);
  }

  private clearTimers(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.finishTimer) {
      clearTimeout(this.finishTimer);
      this.finishTimer = null;
    }
  }
}
