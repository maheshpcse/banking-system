import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * Coordinates post-login shell boot so navbar + first page shimmer
 * appear together instead of navbar alone while the route lazy-loads.
 */
@Injectable({
  providedIn: 'root'
})
export class ShellBootService {
  private readonly bootstrappingSubject = new BehaviorSubject<boolean>(false);
  readonly bootstrapping$ = this.bootstrappingSubject.asObservable();

  get isBootstrapping(): boolean {
    return this.bootstrappingSubject.value;
  }

  begin(): void {
    this.bootstrappingSubject.next(true);
  }

  complete(): void {
    if (this.bootstrappingSubject.value) {
      this.bootstrappingSubject.next(false);
    }
  }
}
