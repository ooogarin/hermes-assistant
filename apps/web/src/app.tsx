import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './app/routes';

export const App = () => (
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>
);
