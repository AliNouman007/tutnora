import { describe, expect, it } from 'vitest';
import { isAppError } from '../../../src/domain/errors';
import { validateRoadmapTopics } from '../../../src/domain/roadmap';
import type { RoadmapNode } from '../../../src/domain/roadmap';

function node(key: string, parentKey: string | null = null): RoadmapNode {
  return { key, parentKey };
}

function validationMessage(
  existing: readonly RoadmapNode[],
  incoming: readonly RoadmapNode[],
): string {
  try {
    validateRoadmapTopics(existing, incoming);
  } catch (error) {
    if (isAppError(error) && error.code === 'VALIDATION') {
      return error.message;
    }
    throw error;
  }
  throw new Error('Expected a VALIDATION error, but the roadmap was accepted.');
}

describe('validateRoadmapTopics', () => {
  it('accepts a new roadmap whose parents are saved in the same request', () => {
    expect(() =>
      validateRoadmapTopics(
        [],
        [node('css'), node('css.layout', 'css'), node('css.layout.position', 'css.layout')],
      ),
    ).not.toThrow();
  });

  it('accepts a topic whose parent is already in the roadmap', () => {
    expect(() => validateRoadmapTopics([node('css')], [node('css.grid', 'css')])).not.toThrow();
  });

  it('accepts moving an existing topic under a different parent', () => {
    expect(() =>
      validateRoadmapTopics(
        [node('css'), node('html'), node('forms', 'html')],
        [node('forms', 'css')],
      ),
    ).not.toThrow();
  });

  it('rejects an invalid topic key', () => {
    expect(validationMessage([], [node('CSS Layout')])).toContain('Invalid topic key');
  });

  it('rejects the same key twice in one save', () => {
    expect(validationMessage([], [node('css'), node('css')])).toContain('Duplicate topic key');
  });

  it('rejects a parent that does not exist', () => {
    expect(validationMessage([node('css')], [node('css.grid', 'css.layout')])).toContain(
      'Unknown parent topic',
    );
  });

  it('rejects a topic that is its own parent', () => {
    expect(validationMessage([], [node('css', 'css')])).toContain('parent cycle');
  });

  it('rejects a cycle between topics in the same save', () => {
    expect(validationMessage([], [node('css', 'html'), node('html', 'css')])).toContain(
      'parent cycle',
    );
  });

  it('rejects a cycle formed with an existing topic', () => {
    expect(
      validationMessage([node('css'), node('css.layout', 'css')], [node('css', 'css.layout')]),
    ).toContain('parent cycle');
  });
});
