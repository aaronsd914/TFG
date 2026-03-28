import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import ModalCenter from '../../frontend/src/components/ModalCenter.jsx';

describe('ModalCenter', () => {
  it('no renderiza nada cuando isOpen es false', () => {
    const { container } = render(
      <ModalCenter isOpen={false} onClose={vi.fn()}>contenido</ModalCenter>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza el contenido cuando isOpen es true', () => {
    const { getByText } = render(
      <ModalCenter isOpen={true} onClose={vi.fn()}>Hola</ModalCenter>
    );
    expect(getByText('Hola')).toBeTruthy();
  });

  it('llama a onClose al hacer click en el fondo', () => {
    const onClose = vi.fn();
    render(<ModalCenter isOpen={true} onClose={onClose}>contenido</ModalCenter>);
    // The backdrop is the first role="button" with aria-label "Cerrar" (a div)
    const backdrop = document.querySelector('button[aria-label="Cerrar"]');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('llama a onClose al presionar Escape en el fondo', () => {
    const onClose = vi.fn();
    render(<ModalCenter isOpen={true} onClose={onClose}>contenido</ModalCenter>);
    const backdrop = document.querySelector('button[aria-label="Cerrar"]');
    fireEvent.keyDown(backdrop, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('no llama a onClose con teclas distintas a Escape', () => {
    const onClose = vi.fn();
    render(<ModalCenter isOpen={true} onClose={onClose}>contenido</ModalCenter>);
    const backdrop = document.querySelector('button[aria-label="Cerrar"]');
    fireEvent.keyDown(backdrop, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('no muestra el botón X cuando showClose es false', () => {
    const onClose = vi.fn();
    render(
      <ModalCenter isOpen={true} onClose={onClose} showClose={false}>contenido</ModalCenter>
    );
    // When showClose=false, the X <button> should not be present (only backdrop button remains)
    const buttons = document.querySelectorAll('button[aria-label="Cerrar"]');
    expect(buttons.length).toBe(1); // only the backdrop button
  });
});
