import { describe, expect, it } from 'vitest';
import { Group } from './Group';
import { Rect } from './Rect';
import { ActiveSelection } from './ActiveSelection';
import { multiplyTransformMatrices } from '../util/misc/matrix';

describe('SVG Export - Group Transform Consistency', () => {
  describe('Single Object Transform Export', () => {
    it('single object with transform should export correct transform in toClipPathSVG', () => {
      const rect = new Rect({
        width: 100,
        height: 100,
        left: 50,
        top: 50,
        angle: 45,
        scaleX: 2,
        scaleY: 2,
      });

      const svg = rect.toClipPathSVG();
      expect(svg).toContain('transform="');

      expect(rect.calcTransformMatrix()).toEqual(rect.calcTransformMatrix());
    });

    it('single object with transform should have consistent transform in toSVG and toClipPathSVG', () => {
      const rect = new Rect({
        width: 100,
        height: 100,
        left: 100,
        top: 100,
        angle: 30,
      });

      const svgTransform = rect.calcTransformMatrix();
      const clipPathTransform = rect.calcTransformMatrix(true);

      expect(svgTransform).toEqual(clipPathTransform);
    });
  });

  describe('Simple Group Export', () => {
    it('group with rotated object should export correct child transforms', () => {
      const rect = new Rect({
        width: 100,
        height: 100,
        left: 0,
        top: 0,
        angle: 0,
        strokeWidth: 0,
      });

      const group = new Group([rect], {
        left: 100,
        top: 100,
        angle: 45,
        strokeWidth: 0,
      });

      const groupTransform = group.calcTransformMatrix();
      const rectTransform = rect.calcTransformMatrix();

      const expectedRectTransform = multiplyTransformMatrices(
        groupTransform,
        rect.calcOwnMatrix(),
      );

      expect(rectTransform).toEqual(expectedRectTransform);
    });

    it('group child toClipPathSVG should include group transform', () => {
      const rect = new Rect({
        width: 100,
        height: 100,
        left: 0,
        top: 0,
        angle: 0,
        strokeWidth: 0,
      });

      new Group([rect], {
        left: 100,
        top: 100,
        angle: 45,
        strokeWidth: 0,
      });

      const rectClipPathSVG = rect.toClipPathSVG();

      expect(rectClipPathSVG).toContain('transform="');
    });
  });

  describe('Nested Group Export', () => {
    it('nested group child should have correct world transform', () => {
      const rect = new Rect({
        width: 50,
        height: 50,
        left: 0,
        top: 0,
        angle: 10,
        strokeWidth: 0,
      });

      const innerGroup = new Group([rect], {
        left: 0,
        top: 0,
        angle: 20,
        strokeWidth: 0,
      });

      const outerGroup = new Group([innerGroup], {
        left: 100,
        top: 100,
        angle: 30,
        strokeWidth: 0,
      });

      const rectWorldTransform = rect.calcTransformMatrix();
      const outerTransform = outerGroup.calcTransformMatrix();
      const innerOwnTransform = innerGroup.calcOwnMatrix();
      const rectOwnTransform = rect.calcOwnMatrix();

      const expectedTransform = multiplyTransformMatrices(
        outerTransform,
        multiplyTransformMatrices(innerOwnTransform, rectOwnTransform),
      );

      for (let i = 0; i < 6; i++) {
        expect(rectWorldTransform[i]).toBeCloseTo(expectedTransform[i], 10);
      }
    });

    it('nested group child toClipPathSVG should include all parent transforms', () => {
      const rect = new Rect({
        width: 50,
        height: 50,
        left: 0,
        top: 0,
        angle: 10,
        strokeWidth: 0,
      });

      const innerGroup = new Group([rect], {
        left: 0,
        top: 0,
        angle: 20,
        strokeWidth: 0,
      });

      new Group([innerGroup], {
        left: 100,
        top: 100,
        angle: 30,
        strokeWidth: 0,
      });

      const rectClipPathSVG = rect.toClipPathSVG();

      expect(rectClipPathSVG).toContain('transform="');

      const rectWorldTransform = rect.calcTransformMatrix();
      const rectTransformInClipPath = rect.calcTransformMatrix();

      expect(rectWorldTransform).toEqual(rectTransformInClipPath);
    });
  });

  describe('_exitGroup and _enterGroup Transform Calculation', () => {
    it('_exitGroup should use calcOwnMatrix not calcTransformMatrix', () => {
      const rect = new Rect({
        width: 100,
        height: 100,
        left: 0,
        top: 0,
        angle: 10,
        strokeWidth: 0,
      });

      const group = new Group([rect], {
        left: 100,
        top: 100,
        angle: 45,
        strokeWidth: 0,
      });

      const groupTransform = group.calcTransformMatrix();
      const rectOwnTransform = rect.calcOwnMatrix();
      const rectFullTransform = rect.calcTransformMatrix();

      const expectedExitTransform = multiplyTransformMatrices(
        groupTransform,
        rectOwnTransform,
      );

      const incorrectTransform = multiplyTransformMatrices(
        groupTransform,
        rectFullTransform,
      );

      expect(expectedExitTransform).not.toEqual(incorrectTransform);
      expect(expectedExitTransform).toEqual(rectFullTransform);
    });

    it('_exitGroup followed by _enterGroup should restore object properties', () => {
      const rect = new Rect({
        width: 100,
        height: 100,
        left: 0,
        top: 0,
        angle: 10,
        scaleX: 1,
        scaleY: 1,
        strokeWidth: 0,
      });

      const group = new Group([rect], {
        left: 100,
        top: 100,
        angle: 45,
        strokeWidth: 0,
      });

      const originalRectAngle = rect.angle;
      const originalRectScaleX = rect.scaleX;
      const originalRectScaleY = rect.scaleY;

      group._exitGroup(rect);

      const worldAngle = rect.angle;

      expect(worldAngle).not.toBe(originalRectAngle);

      group._enterGroup(rect, true);

      expect(rect.angle).toBeCloseTo(originalRectAngle, 5);
      expect(rect.scaleX).toBeCloseTo(originalRectScaleX, 5);
      expect(rect.scaleY).toBeCloseTo(originalRectScaleY, 5);
    });
  });

  describe('ActiveSelection - Enter/Exit Group', () => {
    it('object entering ActiveSelection from Group should have correct properties', () => {
      const rect = new Rect({
        width: 100,
        height: 100,
        left: 0,
        top: 0,
        angle: 10,
        strokeWidth: 0,
      });

      const group = new Group([rect], {
        left: 100,
        top: 100,
        angle: 45,
        strokeWidth: 0,
      });

      expect(rect.group).toBe(group);
      expect(rect.parent).toBe(group);

      const rectWorldTransformBefore = rect.calcTransformMatrix();

      const activeSelection = new ActiveSelection();

      expect(rect.group).toBe(group);
      activeSelection.add(rect);
      expect(rect.group).toBe(activeSelection);
      expect(rect.parent).toBe(group);

      const activeSelectionTransform = activeSelection.calcTransformMatrix();
      const rectOwnTransformInAS = rect.calcOwnMatrix();

      const rectWorldTransformAfter = multiplyTransformMatrices(
        activeSelectionTransform,
        rectOwnTransformInAS,
      );

      const rectMatrixBefore = rectWorldTransformBefore.map(
        (v) => Math.round(v * 1000000) / 1000000,
      );
      const rectMatrixAfter = rectWorldTransformAfter.map(
        (v) => Math.round(v * 1000000) / 1000000,
      );
      expect(rectMatrixBefore).toEqual(rectMatrixAfter);
    });

    it('object exiting ActiveSelection should return to Group with correct properties', () => {
      const rect = new Rect({
        width: 100,
        height: 100,
        left: 0,
        top: 0,
        angle: 10,
        scaleX: 1,
        scaleY: 1,
        strokeWidth: 0,
      });

      const group = new Group([rect], {
        left: 100,
        top: 100,
        angle: 45,
        strokeWidth: 0,
      });

      const originalRectAngle = rect.angle;
      const originalRectScaleX = rect.scaleX;
      const originalRectScaleY = rect.scaleY;

      const activeSelection = new ActiveSelection();
      activeSelection.add(rect);

      const rectAngleInAS = rect.angle;
      expect(rectAngleInAS).not.toBe(originalRectAngle);

      activeSelection.remove(rect);

      expect(rect.group).toBe(group);
      expect(rect.parent).toBe(group);
      expect(rect.angle).toBeCloseTo(originalRectAngle, 5);
      expect(rect.scaleX).toBeCloseTo(originalRectScaleX, 5);
      expect(rect.scaleY).toBeCloseTo(originalRectScaleY, 5);
    });

    it('nested group object entering ActiveSelection should have correct world transform', () => {
      const rect = new Rect({
        width: 50,
        height: 50,
        left: 0,
        top: 0,
        angle: 10,
        strokeWidth: 0,
      });

      const innerGroup = new Group([rect], {
        left: 0,
        top: 0,
        angle: 20,
        strokeWidth: 0,
      });

      new Group([innerGroup], {
        left: 100,
        top: 100,
        angle: 30,
        strokeWidth: 0,
      });

      const rectWorldTransformBefore = rect.calcTransformMatrix();

      const activeSelection = new ActiveSelection();
      activeSelection.add(rect);

      const activeSelectionTransform = activeSelection.calcTransformMatrix();
      const rectOwnTransformInAS = rect.calcOwnMatrix();

      const rectWorldTransformAfter = multiplyTransformMatrices(
        activeSelectionTransform,
        rectOwnTransformInAS,
      );

      const rectMatrixBefore = rectWorldTransformBefore.map(
        (v) => Math.round(v * 1000000) / 1000000,
      );
      const rectMatrixAfter = rectWorldTransformAfter.map(
        (v) => Math.round(v * 1000000) / 1000000,
      );
      expect(rectMatrixBefore).toEqual(rectMatrixAfter);
    });

    it('nested group object exiting ActiveSelection should restore correct properties', () => {
      const rect = new Rect({
        width: 50,
        height: 50,
        left: 0,
        top: 0,
        angle: 10,
        scaleX: 1,
        scaleY: 1,
        strokeWidth: 0,
      });

      const innerGroup = new Group([rect], {
        left: 0,
        top: 0,
        angle: 20,
        strokeWidth: 0,
      });

      new Group([innerGroup], {
        left: 100,
        top: 100,
        angle: 30,
        strokeWidth: 0,
      });

      const originalRectAngle = rect.angle;
      const originalRectScaleX = rect.scaleX;
      const originalRectScaleY = rect.scaleY;

      const activeSelection = new ActiveSelection();
      activeSelection.add(rect);

      const rectAngleInAS = rect.angle;
      expect(rectAngleInAS).not.toBe(originalRectAngle);

      activeSelection.remove(rect);

      expect(rect.group).toBe(innerGroup);
      expect(rect.parent).toBe(innerGroup);
      expect(rect.angle).toBeCloseTo(originalRectAngle, 5);
      expect(rect.scaleX).toBeCloseTo(originalRectScaleX, 5);
      expect(rect.scaleY).toBeCloseTo(originalRectScaleY, 5);
    });
  });

  describe('Group toClipPathSVG Indentation', () => {
    it('group toClipPathSVG should have consistent indentation for children', () => {
      const rect1 = new Rect({
        width: 100,
        height: 100,
        left: 0,
        top: 0,
        strokeWidth: 0,
      });

      const rect2 = new Rect({
        width: 50,
        height: 50,
        left: 50,
        top: 50,
        strokeWidth: 0,
      });

      const group = new Group([rect1, rect2], {
        strokeWidth: 0,
      });

      const groupClipPathSVG = group.toClipPathSVG();
      const lines = groupClipPathSVG.split('\n');

      const rectLines = lines.filter((line) => line.includes('<rect'));
      expect(rectLines.length).toBeGreaterThanOrEqual(2);

      const firstRectIndent = rectLines[0].search(/\S/);
      for (let i = 1; i < rectLines.length; i++) {
        const indent = rectLines[i].search(/\S/);
        expect(indent).toBe(firstRectIndent);
      }
    });
  });

  describe('_createBaseClipPathSVGMarkup - Index -1 Handling', () => {
    it('should not add extra transform when COMMON_PARTS is not present', () => {
      const rect = new Rect({
        width: 100,
        height: 100,
        left: 100,
        top: 100,
        angle: 45,
        strokeWidth: 0,
      });

      const clipPathSVG = rect.toClipPathSVG();

      expect(clipPathSVG).toContain('transform="');

      const transformMatches = clipPathSVG.match(/transform="[^"]+"/g);
      expect(transformMatches).not.toBeNull();

      if (transformMatches) {
        expect(transformMatches.length).toBeLessThanOrEqual(2);
      }
    });
  });
});
