import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminTable from '../components/AdminTable';
import AdminPagination, { PER_PAGE } from '../components/AdminPagination';
import AxiosClient from '../AxiosClient';
import { useUserContext } from '../contexts/UserContext';
import { useLanguage } from '../contexts/LanguageContext';
import { usePopup } from '../contexts/PopupContext';

function RentalRequestsManagement() {
  const { t, translateStatus } = useLanguage();
  const [searchParams] = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const { setMessage } = useUserContext();
  const { showConfirm } = usePopup();
  const highlightedId = searchParams.get('requestId');
  const [resolvedHighlightPage, setResolvedHighlightPage] = useState(!searchParams.get('requestId'));

  useEffect(() => {
    if (!highlightedId) {
      setResolvedHighlightPage(true);
      return;
    }
    AxiosClient.get(`/admin/rental-requests/page-for-id/${highlightedId}`, { params: { per_page: PER_PAGE } })
      .then((r) => {
        setPage(r.data.page);
        setResolvedHighlightPage(true);
      })
      .catch(() => setResolvedHighlightPage(true));
  }, [highlightedId]);

  useEffect(() => {
    if (!resolvedHighlightPage) return;
    fetchRequests();
  }, [page, resolvedHighlightPage]);

  useEffect(() => {
    if (highlightedId && requests.length > 0) {
      setTimeout(() => {
        const element = document.getElementById(`row-${highlightedId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [highlightedId, requests]);

  const fetchRequests = () => {
    setLoading(true);
    AxiosClient.get('/admin/rental-requests', { params: { page, per_page: PER_PAGE } })
      .then((response) => {
        const res = response.data;
        setRequests(res.data || []);
        setPagination({
          current_page: res.current_page ?? 1,
          last_page: res.last_page ?? 1,
          total: res.total ?? 0,
        });
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching rental requests:', error);
        setLoading(false);
      });
  };

  const handleStatusUpdate = (request, newStatus) => {
    AxiosClient.patch(`/admin/rental-requests/${request.id}/status`, { status: newStatus })
      .then(() => {
        setMessage(
          t('admin.rentalRequests') +
            ' ' +
            translateStatus(newStatus) +
            ' ' +
            t('common.success')
        );
        fetchRequests();
      })
      .catch((error) => {
        console.error('Error updating rental request status:', error);
        setMessage(t('admin.errorUpdatingRequest'), 'error');
      });
  };

  const columns = [
    {
      key: 'user',
      label: t('admin.tenant'),
      render: (value, row) => (row.user ? row.user.name : 'N/A'),
    },
    {
      key: 'post',
      label: t('admin.apartment'),
      render: (value, row) => (row.post ? row.post.Title : 'N/A'),
    },
    {
      key: 'requested_at',
      label: t('admin.requestDate'),
      render: (value) => (value ? new Date(value).toLocaleDateString() : 'N/A'),
    },
    {
      key: 'status',
      label: t('admin.status'),
      render: (value) => {
        const statusColors = {
          pending: 'bg-amber-200 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200',
          approved: 'bg-green-200 dark:bg-green-900/50 text-green-800 dark:text-green-200',
          rejected: 'bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-200',
        };
        return (
          <span className={`px-2 py-1 rounded-lg text-sm ${statusColors[value] || 'bg-stone-200 dark:bg-stone-600 text-stone-800 dark:text-stone-200'}`}>
            {translateStatus(value)}
          </span>
        );
      },
    },
  ];

  const handleDelete = async (request) => {
    const confirmed = await showConfirm({
      title: t('admin.delete') + ' ' + t('admin.rentalRequests'),
      message: `${t('admin.delete')} ${t('admin.rentalRequests')}? ${t('admin.confirmDelete') || 'This action cannot be undone.'}`,
      confirmText: t('admin.delete'),
      cancelText: t('admin.cancel'),
      variant: 'danger',
    });

    if (confirmed) {
      AxiosClient.delete(`/admin/rental-requests/${request.id}`)
        .then(() => {
          setMessage(
            t('admin.rentalRequests') +
              ' ' +
              t('admin.deleted') +
              ' ' +
              t('common.success')
          );
          fetchRequests();
        })
        .catch((error) => {
          console.error('Error deleting rental request:', error);
          setMessage(t('admin.errorDeletingRequest') || 'Error deleting rental request', 'error');
        });
    }
  };

  const actions = (request) => {
    const actionButtons = [];
    if (request.status === 'pending') {
      actionButtons.push(
        {
          label: t('admin.approve'),
          onClick: () => handleStatusUpdate(request, 'approved'),
          variant: 'success',
        },
        {
          label: t('admin.reject'),
          onClick: () => handleStatusUpdate(request, 'rejected'),
          variant: 'danger',
        }
      );
    }
    actionButtons.push({
      label: t('admin.delete'),
      onClick: () => handleDelete(request),
      variant: 'danger',
    });
    return actionButtons;
  };

  return (
    <div className="px-5 mx-auto max-w-[1366px] dark:bg-stone-900">
      <h1 className="text-3xl font-bold text-stone-800 dark:text-stone-100 mb-8">{t('admin.rentalRequests')}</h1>
      <AdminTable 
        columns={columns} 
        data={requests} 
        actions={actions} 
        loading={loading}
        highlightedRowId={highlightedId}
      />
      <AdminPagination
        currentPage={pagination.current_page}
        lastPage={pagination.last_page}
        total={pagination.total}
        perPage={PER_PAGE}
        onPageChange={setPage}
      />
    </div>
  );
}

export default RentalRequestsManagement;

