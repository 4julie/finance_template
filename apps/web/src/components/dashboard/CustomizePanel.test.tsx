// SPDX-License-Identifier: BUSL-1.1

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { buildDefaultLayout } from './widget-types';
import { CustomizePanel } from './CustomizePanel';

// Mock the focus trap since jsdom doesn't support full focus management
vi.mock('../../accessibility/aria', () => ({
  useFocusTrap: vi.fn(),
}));

function renderPanel(overrides = {}) {
  const defaultLayout = buildDefaultLayout();
  const props = {
    isOpen: true,
    widgets: defaultLayout.widgets,
    onToggle: vi.fn(),
    onMove: vi.fn(),
    onReset: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  return { ...render(<CustomizePanel {...props} />), props };
}

describe('CustomizePanel', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <CustomizePanel
        isOpen={false}
        widgets={[]}
        onToggle={vi.fn()}
        onMove={vi.fn()}
        onReset={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the dialog title when open', () => {
    renderPanel();
    expect(screen.getByText('Customize Dashboard')).toBeInTheDocument();
  });

  it('renders a checkbox for each widget', () => {
    renderPanel();
    const checkboxes = screen.getAllByRole('checkbox');
    const defaultLayout = buildDefaultLayout();
    expect(checkboxes.length).toBe(defaultLayout.widgets.length);
  });

  it('checkboxes are checked for visible widgets', () => {
    renderPanel();
    const checkboxes = screen.getAllByRole('checkbox');
    // All are visible by default
    for (const checkbox of checkboxes) {
      expect(checkbox).toBeChecked();
    }
  });

  it('calls onToggle when a checkbox is clicked', () => {
    const { props } = renderPanel();

    const firstCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(firstCheckbox);

    expect(props.onToggle).toHaveBeenCalledOnce();
  });

  it('renders move up/down buttons for each widget', () => {
    renderPanel();
    const upButtons = screen.getAllByLabelText(/move .+ up/i);
    const downButtons = screen.getAllByLabelText(/move .+ down/i);

    expect(upButtons.length).toBeGreaterThan(0);
    expect(downButtons.length).toBeGreaterThan(0);
  });

  it('first widget has disabled move-up button', () => {
    renderPanel();
    const upButtons = screen.getAllByLabelText(/move .+ up/i);
    expect(upButtons[0]).toBeDisabled();
  });

  it('last widget has disabled move-down button', () => {
    renderPanel();
    const downButtons = screen.getAllByLabelText(/move .+ down/i);
    expect(downButtons[downButtons.length - 1]).toBeDisabled();
  });

  it('calls onMove when a reorder button is clicked', () => {
    const { props } = renderPanel();

    const downButtons = screen.getAllByLabelText(/move .+ down/i);
    fireEvent.click(downButtons[0]);

    expect(props.onMove).toHaveBeenCalledOnce();
  });

  it('calls onReset when Reset to Defaults is clicked', () => {
    const { props } = renderPanel();

    fireEvent.click(screen.getByText('Reset to Defaults'));
    expect(props.onReset).toHaveBeenCalledOnce();
  });

  it('calls onClose when Done is clicked', () => {
    const { props } = renderPanel();

    fireEvent.click(screen.getByText('Done'));
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it('has accessible dialog role', () => {
    renderPanel();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('dialog has aria-modal attribute', () => {
    renderPanel();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('dialog is labelled by its title', () => {
    renderPanel();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'customize-panel-title');
  });
});
