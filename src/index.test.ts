
import { TestHarness } from 'zora';
import { alignBytes, ArrayBufferViewFactory, MisalignmentBehavior } from '../lib/index';
import { of } from 'rxjs';
import { toArray } from 'rxjs/operators';

export default (t: TestHarness) => {

  t.test('alignBytes', async t => {

    const makeByteArray: ArrayBufferViewFactory<Uint8Array> = (
      buffer: ArrayBuffer,
      byteOffset: number,
      byteLength: number,
    ) => new Uint8Array(buffer, byteOffset, byteLength);

    t.test('one-byte alignment', async t => {
      const result = await of(new Uint8Array([1, 2, 3, 4, 5]))
        .pipe(
          alignBytes(makeByteArray, 1),
          toArray()
        )
        .toPromise();
      t.eq(result.length, 1);
      t.eq(Array.prototype.slice.apply(result[0]), [1, 2, 3, 4, 5]);
    });

    t.test('padZero mode', async t => {
      const result = await of(...[ [1, 2, 3, 4, 5, 6], [7], [8], [9], [10, 11, 12, 13] ].map(v => new Uint8Array(v)))
        .pipe(
          alignBytes(makeByteArray, 3, MisalignmentBehavior.PAD_ZERO),
          toArray()
        )
        .toPromise();
      t.eq(result.length, 4);
      t.eq(Array.prototype.slice.apply(result[0]), [1, 2, 3, 4, 5, 6]);
      t.eq(Array.prototype.slice.apply(result[1]), [7, 8, 9]);
      t.eq(Array.prototype.slice.apply(result[2]), [10, 11, 12]);
      t.eq(Array.prototype.slice.apply(result[3]), [13, 0, 0]);
    });

    t.test('error mode', async t => {
      let error: Error | null = null;
      try {
        await of(new Uint8Array([1, 2, 3]))
          .pipe(
            alignBytes(makeByteArray, 4, MisalignmentBehavior.ERROR),
            toArray()
          )
          .toPromise();
      }
      catch (e) {
        error = e;
      }
      t.ok(error !== null);
    });

    t.test('retain mode', async t => {
      const result = await of(new Uint8Array([1, 2, 3]))
        .pipe(
          alignBytes(makeByteArray, 2, MisalignmentBehavior.RETAIN),
          toArray()
        )
        .toPromise();
      t.eq(result.length, 2);
      t.eq(Array.prototype.slice.apply(result[0]), [1, 2]);
      t.eq(Array.prototype.slice.apply(result[1]), [3]);
    });

    t.test('truncate', async t => {
      const result = await of(new Uint8Array([1, 2, 3]))
        .pipe(
          alignBytes(makeByteArray, 2, MisalignmentBehavior.TRUNCATE),
          toArray()
        )
        .toPromise();
      t.eq(result.length, 1);
      t.eq(Array.prototype.slice.apply(result[0]), [1, 2]);
    });

  });

}
