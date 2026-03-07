// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { BaseMergeHelper } from '../BaseMergeHelper';

class ConcreteMergeHelper extends BaseMergeHelper {
  public get fileRelativePath(): string {
    return 'test/file.txt';
  }

  public merge(existingContent: string, newContent: string): string {
    return `${existingContent}\n${newContent}`;
  }
}

describe('BaseMergeHelper', () => {
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
