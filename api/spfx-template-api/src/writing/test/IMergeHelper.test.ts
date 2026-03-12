// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { IMergeHelper } from '../IMergeHelper';

class ConcreteMergeHelper implements IMergeHelper {
  public readonly fileRelativePath: string = 'test/file.txt';

  public merge(existingContent: string, newContent: string): string {
    return `${existingContent}\n${newContent}`;
  }
}

describe('IMergeHelper', () => {
  let helper: ConcreteMergeHelper;

  beforeEach(() => {
    helper = new ConcreteMergeHelper();
  });

  it('should expose fileRelativePath', () => {
    expect(helper.fileRelativePath).toBe('test/file.txt');
  });

  it('should call merge with existing and new content', () => {
    const result = helper.merge('existing', 'new');
    expect(result).toBe('existing\nnew');
  });
});
