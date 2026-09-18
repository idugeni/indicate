// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import {
  Questionnaire,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireItem,
  QuestionnaireTitle,
} from '@/components/ui/questionnaire';

afterEach(() => {
  cleanup();
});

describe('Kuesioner', () => {
  it('merender judul dan pilihan', () => {
    render(
      <Questionnaire>
        <QuestionnaireItem name="warna">
          <QuestionnaireTitle>Warna favorit</QuestionnaireTitle>
          <QuestionnaireChoices>
            <QuestionnaireChoice value="merah">Merah</QuestionnaireChoice>
            <QuestionnaireChoice value="biru">Biru</QuestionnaireChoice>
          </QuestionnaireChoices>
        </QuestionnaireItem>
      </Questionnaire>,
    );
    expect(screen.getByText('Warna favorit')).toBeDefined();
    expect(screen.getByText('Merah')).toBeDefined();
    expect(screen.getByText('Biru')).toBeDefined();
  });

  it('merender slot kuesioner', () => {
    const { container } = render(
      <Questionnaire>
        <QuestionnaireItem name="warna">
          <QuestionnaireTitle>Warna favorit</QuestionnaireTitle>
        </QuestionnaireItem>
      </Questionnaire>,
    );
    expect(container.querySelector('[data-slot="questionnaire"]')).not.toBe(null);
  });
});
