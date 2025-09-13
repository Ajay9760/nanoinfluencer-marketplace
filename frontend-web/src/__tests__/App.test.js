import { render, screen } from '@testing-library/react';
import App from '../App';

// Mock React Router since our App component uses it
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => <div data-testid="mock-router">{children}</div>,
  Routes: ({ children }) => <div data-testid="mock-routes">{children}</div>,
  Route: ({ children }) => <div data-testid="mock-route">{children}</div>,
}));

// Mock the AuthContext since our App uses it
jest.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => <div data-testid="mock-auth-provider">{children}</div>,
}));

describe('App Component', () => {
  test('renders without crashing', () => {
    render(<App />);
    // Check if the app renders with the mocked router
    const mockRouter = screen.getByTestId('mock-router');
    expect(mockRouter).toBeInTheDocument();
  });

  test('should have proper structure with auth provider', () => {
    render(<App />);
    const authProvider = screen.getByTestId('mock-auth-provider');
    expect(authProvider).toBeInTheDocument();
  });
});

describe('Basic Functionality Tests', () => {
  test('should handle basic JavaScript operations', () => {
    expect(1 + 1).toBe(2);
    expect('hello').toBe('hello');
  });

  test('should validate React testing setup', () => {
    const testElement = render(<div>Test</div>);
    expect(testElement).toBeTruthy();
  });
});