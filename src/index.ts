
import { OperatorFunction, Observable } from 'rxjs'

export type ArrayBufferViewFactory<TView> = (arrayBuffer: ArrayBuffer, byteOffset: number, byteLength: number) => TView;

export function alignBytes<T extends {buffer:ArrayBuffer, byteOffset:number, byteLength:number}>(createView: ArrayBufferViewFactory<T>, alignByteLength: number): OperatorFunction<T, T> {
  if (alignByteLength < 2) return input => input;
  return input => new Observable(subscriber => {
    let prefix: Uint8Array | null = null;
    let prefixOffset = 0;
    return input.subscribe(
      chunk => {
        if (prefixOffset !== 0) {
          const copy = new Uint8Array(chunk.buffer, chunk.byteOffset, Math.min(alignByteLength - prefixOffset, chunk.byteLength));
          prefix!.set(copy, prefixOffset);
          prefixOffset += copy.length;
          if (prefixOffset < alignByteLength) {
            return;
          }
          subscriber.next(createView(prefix!.buffer, prefix!.byteOffset, prefix!.byteLength));
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
        if (prefix) {
          subscriber.next(createView(prefix.buffer, prefix.byteOffset, prefix.byteLength));
          prefix = null;
        }
        subscriber.complete();
      }
    );
  });
}
