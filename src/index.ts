
import { OperatorFunction, Observable } from 'rxjs'

export const enum MisalignmentBehavior {
  TRUNCATE = 'truncate',
  PAD_ZERO = 'padZero',
  ERROR = 'error',
  RETAIN = 'retain',
}

export type ArrayBufferViewFactory<TView extends ArrayBufferView> = (
  arrayBuffer: ArrayBuffer,
  byteOffset: number,
  byteLength: number,
) => TView;

export function alignBytes<T extends ArrayBufferView>(
  createView: ArrayBufferViewFactory<T>,
  alignByteLength: number,
  onMisalignment = MisalignmentBehavior.PAD_ZERO,
): OperatorFunction<T, T> {
  if (alignByteLength < 2) return input => input;
  return input => new Observable(subscriber => {
    let prefix: Uint8Array | null = null;
    let prefixOffset = 0;
    return input.subscribe(
      chunk => {
        if (prefix) {
          const copy = new Uint8Array(
            chunk.buffer,
            chunk.byteOffset,
            Math.min(alignByteLength - prefixOffset, chunk.byteLength)
          );
          prefix.set(copy, prefixOffset);
          prefixOffset += copy.length;
          if (prefixOffset < alignByteLength) {
            return;
          }
          subscriber.next(createView(prefix.buffer, prefix.byteOffset, prefix.byteLength));
          prefix = null;
          chunk = createView(chunk.buffer, chunk.byteOffset + copy.length, chunk.byteLength - copy.length);
        }
        prefixOffset = chunk.byteLength % alignByteLength;
        if (prefixOffset === 0) {
          if (chunk.byteLength !== 0) {
            subscriber.next(chunk);
          }
        }
        else {
          const rest = chunk.byteLength - prefixOffset;
          if (rest !== 0) {
            subscriber.next(createView(chunk.buffer, chunk.byteOffset, rest));
          }
          prefix = new Uint8Array(alignByteLength);
          prefix.set(new Uint8Array(chunk.buffer, chunk.byteOffset + rest));
        }
      },
      e => subscriber.error(e),
      () => {
        if (prefix) switch (onMisalignment) {
          case MisalignmentBehavior.ERROR: {
            subscriber.error(new Error('non-aligned byte suffix'));
            return;
          }
          case MisalignmentBehavior.PAD_ZERO: {
            subscriber.next(createView(prefix.buffer, prefix.byteOffset, prefix.byteLength));
            break;
          }
          case MisalignmentBehavior.RETAIN: {
            subscriber.next(createView(prefix.buffer, prefix.byteOffset, prefixOffset));
            break;
          }
          case MisalignmentBehavior.TRUNCATE: {
            // do nothing
            break;
          }
        }
        subscriber.complete();
      }
    );
  });
}
