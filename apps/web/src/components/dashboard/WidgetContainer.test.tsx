// SPDX-License-Identifier: BUSL-1.1

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { WidgetContainer } from './WidgetContainer';

describe('WidgetContainer', () => {
  it('renders the widget title', () => {
    render(
      <WidgetContainer id="net-worth" title="Net Worth" size="small">
        <p>$1,000</p>
      </WidgetContainer>,
    );
    expect(screen.getByText('Net Worth')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <WidgetContainer id="net-worth" title="Net Worth" size="small">
        <p>$1,000</p>
      </WidgetContainer>,
    );
    expect(screen.getByText('$1,000')).toBeInTheDocument();
  });

  it('has accessible article role with aria-label', () => {
    render(
      <WidgetContainer id="net-worth" title="Net Worth" size="small">
        <p>content</p>
      </WidgetContainer>,
    );
    const article = screen.getByRole('article', { name: 'Net Worth' });
    expect(article).toBeInTheDocument();
  });

  it('applies the size class', () => {
    render(
      <WidgetContainer id="net-worth" title="Net Worth" size="large">
        <p>content</p>
      </WidgetContainer>,
    );
    const article = screen.getByRole('article', { name: 'Net Worth' });
    expect(article).toHaveClass('widget--large');
  });

  it('sets data-widget-size attribute', () => {
    render(
      <WidgetContainer id="test" title="Test Widget" size="medium">
        <p>content</p>
      </WidgetContainer>,
    );
    const article = screen.getByRole('article', { name: 'Test Widget' });
    expect(article).toHaveAttribute('data-widget-size', 'medium');
  });

  it('sets data-widget-id attribute', () => {
    render(
      <WidgetContainer id="budget-health" title="Budget Health" size="small">
        <p>content</p>
      </WidgetContainer>,
    );
    const article = screen.getByRole('article', { name: 'Budget Health' });
    expect(article).toHaveAttribute('data-widget-id', 'budget-health');
  });
});
