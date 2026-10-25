// client/src/pages/NotFoundPage.jsx
import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import Button from '../components/ui/Button';

const NotFoundPage = () => (
  <div className="min-h-screen bg-surface-50 flex items-center justify-center px-4">
    <div className="text-center max-w-md">
      <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-6">
        <FileQuestion className="w-8 h-8 text-surface-400" aria-hidden="true" />
      </div>
      <h1 className="text-4xl font-bold text-surface-900 mb-2">404</h1>
      <h2 className="text-lg font-medium text-surface-700 mb-3">Page not found</h2>
      <p className="text-sm text-surface-500 mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/">
        <Button variant="primary">Go home</Button>
      </Link>
    </div>
  </div>
);

export default NotFoundPage;
