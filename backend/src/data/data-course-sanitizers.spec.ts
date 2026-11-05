import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AuthUser } from '../auth/auth.store.js';
import { sanitizeCourseRecord } from './data-course-sanitizers.js';

const formateur = { id: 'usr-spec-formateur', role: 'formateur' } as AuthUser;
const baseDraft = { title: 'Excel pour débutants', category: 'informatique', modules: 1 };

describe('sanitizeCourseRecord', () => {
  it('accepts a quick-start draft without duration (computed later from the programme)', () => {
    const course = sanitizeCourseRecord({ ...baseDraft }, formateur);
    assert.equal(course.status, 'draft');
    assert.equal(course.duration, '');
    assert.equal(course.language, 'Français');
    assert.deepEqual(course.objectives, []);
    assert.equal(course.instructor_id, formateur.id);
  });

  it('still requires a duration before review', () => {
    assert.throws(
      () => sanitizeCourseRecord({ ...baseDraft, status: 'review', description: 'x', thumbnail: 'https://c2p.sn/a.webp' }, formateur),
      /une duree/,
    );
  });

  it('normalises the landing-page lists and drops blank entries', () => {
    const course = sanitizeCourseRecord({
      ...baseDraft,
      objectives: ['  Créer un tableau croisé ', '', 'Automatiser une macro'],
      prerequisites: 'Savoir allumer un ordinateur\n\nAvoir Excel',
      target_audience: ['Comptables'],
    }, formateur);
    assert.deepEqual(course.objectives, ['Créer un tableau croisé', 'Automatiser une macro']);
    assert.deepEqual(course.prerequisites, ['Savoir allumer un ordinateur', 'Avoir Excel']);
    assert.deepEqual(course.target_audience, ['Comptables']);
  });

  it('bounds the subtitle and list sizes', () => {
    assert.throws(() => sanitizeCourseRecord({ ...baseDraft, subtitle: 'x'.repeat(121) }, formateur), /sous-titre/);
    assert.throws(() => sanitizeCourseRecord({ ...baseDraft, objectives: Array(21).fill('ok') }, formateur), /au plus 20/);
    assert.throws(() => sanitizeCourseRecord({ ...baseDraft, objectives: ['x'.repeat(201)] }, formateur), /200 caracteres/);
  });
});
