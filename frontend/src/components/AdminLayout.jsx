import { Outlet, Navigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import { useUserContext } from '../contexts/UserContext';

function AdminLayout() {
  const { user, isAdmin } = useUserContext();

  if (!user || !isAdmin()) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen bg-stone-50 dark:bg-stone-900">
      <AdminSidebar />
      <main className="flex-1 p-5 min-h-screen bg-stone-50 dark:bg-stone-900">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;

