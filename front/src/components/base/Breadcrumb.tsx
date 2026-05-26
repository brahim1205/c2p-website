import { Link, useLocation } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  const location = useLocation();

  if (
    location.pathname.startsWith('/dashboard')
    || location.pathname.startsWith('/admin')
    || location.pathname.startsWith('/compte')
  ) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6" aria-label="Breadcrumb">
      <Link to="/" className="hover:text-teal-600 transition-colors flex items-center">
        <div className="w-4 h-4 flex items-center justify-center">
          <i className="ri-home-line text-sm"></i>
        </div>
      </Link>
      {items.map((item, index) => (
        <span key={index} className="flex items-center space-x-2">
          <div className="w-4 h-4 flex items-center justify-center">
            <i className="ri-arrow-right-s-line text-sm text-gray-400"></i>
          </div>
          {item.path ? (
            <Link
              to={item.path}
              className="hover:text-teal-600 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-800 font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
