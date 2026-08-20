import { Observable, of, timer } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

/** Site-wide shimmer floor — ~0.6s so loaders are visible but snappy. */
export const SHIMMER_MS = 600;

/**
 * Keep shimmer at least `minMs` total so filters/page boots show a brief
 * loader even when the API returns instantly.
 */
export function withShimmerDelay<T>(request$: Observable<T>, minMs = SHIMMER_MS): Observable<T> {
  const started = Date.now();
  return request$.pipe(
    switchMap((result) => {
      const wait = Math.max(0, minMs - (Date.now() - started));
      return wait > 0 ? timer(wait).pipe(map(() => result)) : of(result);
    })
  );
}

/** Client-side filter flash (no network) — same timing as page shimmers. */
export function shimmerPause(minMs = SHIMMER_MS): Observable<true> {
  return withShimmerDelay(of(true), minMs);
}
