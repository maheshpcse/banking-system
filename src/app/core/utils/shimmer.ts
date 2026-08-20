import { Observable, of, timer } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

/**
 * Keep shimmer at least `minMs` total (default 220) so pages feel as snappy
 * as Alerts (which clear when the API returns) without a harsh flash.
 */
export function withShimmerDelay<T>(request$: Observable<T>, minMs = 220): Observable<T> {
  const started = Date.now();
  return request$.pipe(
    switchMap((result) => {
      const wait = Math.max(0, minMs - (Date.now() - started));
      return wait > 0 ? timer(wait).pipe(map(() => result)) : of(result);
    })
  );
}
