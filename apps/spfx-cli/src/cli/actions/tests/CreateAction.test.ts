import { SOLUTION_NAME_PATTERN } from '../../validation';

describe('SOLUTION_NAME_PATTERN', () => {
  it('should accept simple alphanumeric names', () => {
    expect(SOLUTION_NAME_PATTERN.test('my-solution')).toBe(true);
    expect(SOLUTION_NAME_PATTERN.test('mySolution')).toBe(true);
    expect(SOLUTION_NAME_PATTERN.test('solution123')).toBe(true);
  });

  it('should accept names with hyphens and underscores', () => {
    expect(SOLUTION_NAME_PATTERN.test('my-solution-name')).toBe(true);
    expect(SOLUTION_NAME_PATTERN.test('my_solution_name')).toBe(true);
    expect(SOLUTION_NAME_PATTERN.test('my-solution_name')).toBe(true);
  });

  it('should accept single character names', () => {
    expect(SOLUTION_NAME_PATTERN.test('a')).toBe(true);
    expect(SOLUTION_NAME_PATTERN.test('Z')).toBe(true);
    expect(SOLUTION_NAME_PATTERN.test('9')).toBe(true);
  });

  it('should reject names starting with a hyphen or underscore', () => {
    expect(SOLUTION_NAME_PATTERN.test('-my-solution')).toBe(false);
    expect(SOLUTION_NAME_PATTERN.test('_my-solution')).toBe(false);
  });

  it('should reject names with spaces', () => {
    expect(SOLUTION_NAME_PATTERN.test('my solution')).toBe(false);
    expect(SOLUTION_NAME_PATTERN.test(' my-solution')).toBe(false);
  });

  it('should reject names with special characters', () => {
    expect(SOLUTION_NAME_PATTERN.test('my@solution')).toBe(false);
    expect(SOLUTION_NAME_PATTERN.test('my.solution')).toBe(false);
    expect(SOLUTION_NAME_PATTERN.test('my/solution')).toBe(false);
    expect(SOLUTION_NAME_PATTERN.test('my!solution')).toBe(false);
  });

  it('should reject empty strings', () => {
    expect(SOLUTION_NAME_PATTERN.test('')).toBe(false);
  });
});
