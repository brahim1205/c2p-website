import { useDarkMode } from '@/hooks/useDarkMode';

export default function DarkModeToggle() {
  const { isDark, toggle } = useDarkMode();

  return (
    <button
      onClick={toggle}
      className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
      title={isDark ? 'Mode clair' : 'Mode sombre'}
      type="button"
    >
      <div className="w-5 h-5 flex items-center justify-center">
        <i className={`${isDark ? 'ri-sun-line' : 'ri-moon-line'} text-lg text-gray-600 dark:text-gray-300`}></i>
      </div>
    </button>
  );
}