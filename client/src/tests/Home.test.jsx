import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Home from '../pages/Home';
import { BrowserRouter } from 'react-router-dom';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ state: {} }),
  };
});

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Home Component', () => {
  it('renders home page with logo and inputs', () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );
    
    expect(screen.getByAltText('logo')).toBeDefined();
    expect(screen.getByPlaceholderText('ROOM ID')).toBeDefined();
    expect(screen.getByPlaceholderText('USERNAME')).toBeDefined();
    expect(screen.getByText('Join')).toBeDefined();
  });

  it('updates input values when typed', () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );
    
    const roomIdInput = screen.getByPlaceholderText('ROOM ID');
    const usernameInput = screen.getByPlaceholderText('USERNAME');
    
    fireEvent.change(roomIdInput, { target: { value: 'test-room' } });
    fireEvent.change(usernameInput, { target: { value: 'test-user' } });
    
    expect(roomIdInput.value).toBe('test-room');
    expect(usernameInput.value).toBe('test-user');
  });
});
