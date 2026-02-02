/**
 * Base layout – responsive sidebar (drawer on mobile) + main content.
 * Use for dashboards and pages that need a consistent shell.
 * Navbar/header is provided by the parent (e.g. Header); this wraps content + optional sidebar.
 */
import React from 'react';

export interface AppLayoutProps {
  /** Sidebar content (e.g. nav links). On mobile, show via drawer/toggle from parent. */
  sidebar?: React.ReactNode;
  /** Whether sidebar is visible on mobile (drawer open) */
  sidebarOpen?: boolean;
  /** Called when the mobile overlay is clicked (use to close sidebar, e.g. setSidebarOpen(false)) */
  onOverlayClick?: () => void;
  /** Main content area */
  children: React.ReactNode;
  /** Extra class for main content wrapper */
  className?: string;
  /** Max width of content (default max-w-7xl) */
  maxWidth?: 'none' | '5xl' | '6xl' | '7xl';
}

const maxWidthMap = {
  none: '',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
};

const AppLayout: React.FC<AppLayoutProps> = ({
  sidebar,
  sidebarOpen = false,
  onOverlayClick,
  children,
  className = '',
  maxWidth = '7xl',
}) => {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {sidebar && (
        <>
          {sidebarOpen && (
            <button
              type="button"
              className="fixed inset-0 bg-black/30 z-30 sm:hidden"
              aria-hidden="true"
              aria-label="Close menu"
              onClick={onOverlayClick ?? undefined}
            />
          )}
          <aside
            className={`
              fixed sm:sticky top-0 left-0 z-40 h-screen w-[280px] sm:w-56
              bg-white border-r border-gray-200
              transform transition-transform duration-200 ease-out
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'}
            `}
            aria-label="Sidebar"
          >
            <div className="h-full overflow-y-auto mobile-scroll py-4 sm:py-5">
              <div className="px-3 sm:px-4">
                {sidebar}
              </div>
            </div>
          </aside>
        </>
      )}
      <main
        className={`
          flex-1 min-w-0 min-h-screen
          px-4 sm:px-6 lg:px-8
          py-5 sm:py-6 lg:py-8
        `}
        role="main"
      >
        <div className={`mx-auto w-full ${maxWidthMap[maxWidth]} ${className}`}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
