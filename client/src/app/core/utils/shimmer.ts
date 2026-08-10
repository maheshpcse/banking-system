import { Observable, timer } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

/**
 * Keeps shimmer visible for API response time + extraMs (default 500ms).
 */
export function withShimmerDelay<T>(request$: Observable<T>, extraMs = 500): Observable<T> {
  const started = Date.now();
  return request$.pipe(
    switchMap((result) => {
      const apiMs = Date.now() - started;
      // Ensure callers can reason about total shimmer = apiMs + extraMs
      void apiMs;
      return timer(extraMs).pipe(map(() => result));
    })
  );
}
