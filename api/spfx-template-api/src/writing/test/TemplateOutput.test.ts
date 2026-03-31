// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { TemplateOutput } from '../TemplateOutput';

describe(TemplateOutput.name, () => {
  let fs: TemplateOutput;

  beforeEach(() => {
    fs = new TemplateOutput();
  });

  describe('write and read', () => {
    it('should store and retrieve text content', () => {
      fs.write('src/index.ts', 'const x = 1;');
      expect(fs.read('src/index.ts')).toBe('const x = 1;');
    });

    it('should store and retrieve binary content', () => {
      const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      fs.write('assets/logo.png', buffer);
      expect(fs.read('assets/logo.png')).toEqual(buffer);
    });

    it('should return undefined for non-existent path', () => {
      expect(fs.read('does/not/exist.ts')).toBeUndefined();
    });

    it('should overwrite existing entry on second write', () => {
      fs.write('file.txt', 'first');
      fs.write('file.txt', 'second');
      expect(fs.read('file.txt')).toBe('second');
    });

    it('should handle empty string content', () => {
      fs.write('empty.txt', '');
      expect(fs.read('empty.txt')).toBe('');
    });

    it('should handle empty Buffer content', () => {
      const empty = Buffer.alloc(0);
      fs.write('empty.bin', empty);
      expect(fs.read('empty.bin')).toEqual(empty);
    });
  });

  describe('files getter', () => {
    it('should return an empty map initially', () => {
      expect(fs.files.size).toBe(0);
    });

    it('should reflect written entries', () => {
      fs.write('a.ts', 'a');
      fs.write('b.ts', 'b');
      expect(fs.files.size).toBe(2);
      expect(fs.files.get('a.ts')?.contents).toBe('a');
      expect(fs.files.get('b.ts')?.contents).toBe('b');
    });

    it('should return a read-only map', () => {
      // The ReadonlyMap type prevents set/delete at compile time.
      // At runtime verify the underlying map is the same reference.
      fs.write('x.ts', 'x');
      const ref1 = fs.files;
      fs.write('y.ts', 'y');
      const ref2 = fs.files;
      // Both references point to the same underlying map
      expect(ref1).toBe(ref2);
      expect(ref1.size).toBe(2);
    });

    it('should support iteration', () => {
      fs.write('one.ts', '1');
      fs.write('two.ts', '2');
      fs.write('three.ts', '3');

      const keys: string[] = [];
      for (const [key] of fs.files) {
        keys.push(key);
      }
      expect(keys).toEqual(['one.ts', 'two.ts', 'three.ts']);
    });
  });
});
