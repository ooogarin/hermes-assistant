import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './app/auth/auth-context';
import { AppRoutes } from './app/routes';

export const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </BrowserRouter>
);
