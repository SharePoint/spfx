// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { PackageSolutionJsonMergeHelper } from '../PackageSolutionJsonMergeHelper';

describe('PackageSolutionJsonMergeHelper', () => {
  let helper: PackageSolutionJsonMergeHelper;

  beforeEach(() => {
    helper = new PackageSolutionJsonMergeHelper();
  });

  it('should have fileRelativePath of "config/package-solution.json"', () => {
    expect(helper.fileRelativePath).toBe('config/package-solution.json');
  });

  it('should append new features', () => {
    const existing = JSON.stringify({
      solution: {
        name: 'my-solution',
        id: 'sol-1',
        features: [{ id: 'feat-1', title: 'Feature 1' }]
      }
    });

    const incoming = JSON.stringify({
      solution: {
        name: 'incoming-solution',
        id: 'sol-2',
        features: [{ id: 'feat-2', title: 'Feature 2' }]
      }
    });

    const result = JSON.parse(helper.merge(existing, incoming));

    expect(result.solution.features).toHaveLength(2);
    expect(result.solution.features[0].id).toBe('feat-1');
    expect(result.solution.features[1].id).toBe('feat-2');
  });

  it('should skip duplicate features by id', () => {
    const existing = JSON.stringify({
      solution: {
        features: [{ id: 'feat-1', title: 'Feature 1' }]
      }
    });

    const incoming = JSON.stringify({
      solution: {
        features: [
          { id: 'feat-1', title: 'Feature 1 Updated' },
          { id: 'feat-2', title: 'Feature 2' }
        ]
      }
    });

    const result = JSON.parse(helper.merge(existing, incoming));

    expect(result.solution.features).toHaveLength(2);
    expect(result.solution.features[0].title).toBe('Feature 1');
    expect(result.solution.features[1].id).toBe('feat-2');
  });

  it('should preserve solution-level metadata from existing', () => {
    const existing = JSON.stringify({
      $schema: 'https://schema.example.com',
      solution: {
        name: 'my-solution',
        id: 'sol-1',
        version: '1.0.0.0',
        developer: { name: 'Developer' },
        features: []
      },
      paths: { zippedPackage: 'solution/my-solution.sppkg' }
    });

    const incoming = JSON.stringify({
      solution: {
        name: 'new-solution',
        id: 'sol-2',
        features: [{ id: 'feat-1', title: 'Feature 1' }]
      }
    });

    const result = JSON.parse(helper.merge(existing, incoming));

    expect(result.solution.name).toBe('my-solution');
    expect(result.solution.id).toBe('sol-1');
    expect(result.solution.version).toBe('1.0.0.0');
    expect(result.solution.developer).toEqual({ name: 'Developer' });
    expect(result.paths).toEqual({ zippedPackage: 'solution/my-solution.sppkg' });
  });

  it('should handle missing features in existing', () => {
    const existing = JSON.stringify({
      solution: { name: 'my-solution' }
    });

    const incoming = JSON.stringify({
      solution: {
        features: [{ id: 'feat-1', title: 'Feature 1' }]
      }
    });

    const result = JSON.parse(helper.merge(existing, incoming));

    expect(result.solution.features).toHaveLength(1);
    expect(result.solution.features[0].id).toBe('feat-1');
  });

  it('should handle missing features in incoming', () => {
    const existing = JSON.stringify({
      solution: {
        features: [{ id: 'feat-1', title: 'Feature 1' }]
      }
    });

    const incoming = JSON.stringify({
      solution: { name: 'new-solution' }
    });

    const result = JSON.parse(helper.merge(existing, incoming));

    expect(result.solution.features).toHaveLength(1);
  });
});
