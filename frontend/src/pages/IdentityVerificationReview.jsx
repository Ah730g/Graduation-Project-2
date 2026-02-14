import React, { useState, useEffect } from 'react';
import AxiosClient from '../AxiosClient';
import { useLanguage } from '../contexts/LanguageContext';
import { usePopup } from '../contexts/PopupContext';
import AdminPagination, { PER_PAGE } from '../components/AdminPagination';

function IdentityVerificationReview() {
  const { t } = useLanguage();
  const { showToast, showConfirm } = usePopup();
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [selectedRejectionReason, setSelectedRejectionReason] = useState('');
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected

  // Predefined rejection reasons
  const rejectionReasons = [
    {
      id: 'unclear_document',
      en: 'Document image is unclear or not readable',
      ar: 'صورة المستند غير واضحة أو غير قابلة للقراءة'
    },
    {
      id: 'expired_document',
      en: 'Document has expired',
      ar: 'المستند منتهي الصلاحية'
    },
    {
      id: 'invalid_document',
      en: 'Document type does not match the selected type',
      ar: 'نوع المستند لا يطابق النوع المحدد'
    },
    {
      id: 'incomplete_information',
      en: 'Required information is missing or incomplete',
      ar: 'المعلومات المطلوبة مفقودة أو غير مكتملة'
    },
    {
      id: 'mismatched_data',
      en: 'Document data does not match the entered information',
      ar: 'بيانات المستند لا تطابق المعلومات المدخلة'
    },
    {
      id: 'fake_document',
      en: 'Document appears to be fake or tampered with',
      ar: 'المستند يبدو مزوراً أو تم التلاعب به'
    },
    {
      id: 'other',
      en: 'Other reason (please specify)',
      ar: 'سبب آخر (يرجى التحديد)'
    }
  ];

  useEffect(() => {
    setPage(1);
  }, [filter]);

  useEffect(() => {
    fetchVerifications();
  }, [filter, page]);

  const fetchVerifications = async () => {
    setLoading(true);
    try {
      const endpoint = filter === 'pending'
        ? '/admin/identity-verifications/pending'
        : '/admin/identity-verifications';
      const response = await AxiosClient.get(endpoint, { params: { page, per_page: PER_PAGE } });
      const res = response.data;
      const data = res.data ?? (Array.isArray(res) ? res : []);
      setVerifications(Array.isArray(data) ? data : []);
      setPagination({
        current_page: res.current_page ?? 1,
        last_page: res.last_page ?? 1,
        total: res.total ?? 0,
      });
    } catch (error) {
      console.error('Error fetching verifications:', error);
      setVerifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await AxiosClient.post(`/admin/identity-verifications/${id}/approve`);
      showToast('Verification approved successfully!', 'success');
      fetchVerifications();
      setSelectedVerification(null);
    } catch (error) {
      showToast('Error approving verification: ' + (error.response?.data?.message || error.message), 'error');
    }
  };

  const handleReject = async (id) => {
    let finalNotes = '';
    
    if (selectedRejectionReason && selectedRejectionReason !== 'other') {
      const reason = rejectionReasons.find(r => r.id === selectedRejectionReason);
      finalNotes = reason ? `${reason.en} / ${reason.ar}` : '';
    }
    
    if (rejectNotes.trim()) {
      finalNotes = finalNotes ? `${finalNotes}\n\nAdditional notes: ${rejectNotes}` : rejectNotes;
    }

    if (!finalNotes.trim() || finalNotes.trim().length < 10) {
      showToast('Please select a rejection reason or provide a custom reason (minimum 10 characters)', 'warning');
      return;
    }

    try {
      await AxiosClient.post(`/admin/identity-verifications/${id}/reject`, {
        notes: finalNotes,
      });
      showToast('Verification rejected.', 'success');
      fetchVerifications();
      setSelectedVerification(null);
      setRejectNotes('');
      setSelectedRejectionReason('');
    } catch (error) {
      showToast('Error rejecting verification: ' + (error.response?.data?.message || error.message), 'error');
    }
  };

  const handleRejectAfterApproval = async (id) => {
    let finalNotes = '';
    
    if (selectedRejectionReason && selectedRejectionReason !== 'other') {
      const reason = rejectionReasons.find(r => r.id === selectedRejectionReason);
      finalNotes = reason ? `${reason.en} / ${reason.ar}` : '';
    }
    
    if (rejectNotes.trim()) {
      finalNotes = finalNotes ? `${finalNotes}\n\nAdditional notes: ${rejectNotes}` : rejectNotes;
    }

    if (!finalNotes.trim() || finalNotes.trim().length < 10) {
      showToast('Please select a rejection reason or provide a custom reason (minimum 10 characters)', 'warning');
      return;
    }

    try {
      await AxiosClient.post(`/admin/identity-verifications/${id}/reject-after-approval`, {
        notes: finalNotes,
      });
      showToast('Verification approval revoked and rejected.', 'success');
      fetchVerifications();
      setSelectedVerification(null);
      setRejectNotes('');
      setSelectedRejectionReason('');
    } catch (error) {
      showToast('Error rejecting verification: ' + (error.response?.data?.message || error.message), 'error');
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm(
      'Delete Verification Record',
      'Are you sure you want to delete this verification record? This action cannot be undone.',
      'Delete',
      'Cancel'
    );

    if (!confirmed) return;

    try {
      await AxiosClient.delete(`/admin/identity-verifications/${id}`);
      showToast('Verification record deleted successfully.', 'success');
      fetchVerifications();
    } catch (error) {
      showToast('Error deleting verification: ' + (error.response?.data?.message || error.message), 'error');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200',
      approved: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200',
      rejected: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200',
    };
    return badges[status] || 'bg-stone-100 dark:bg-stone-600 text-stone-800 dark:text-stone-200';
  };

  const filteredVerifications = filter === 'all' 
    ? verifications 
    : verifications.filter(v => v.status === filter);

  return (
    <div className="p-5 mx-auto max-w-[1366px] dark:bg-stone-900">
      <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-6">{t('admin.identityVerifications')}</h2>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'all' ? 'bg-amber-400 dark:bg-amber-500 text-stone-900 font-bold' : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-600'
          }`}
        >
          {t('admin.all') || 'All'}
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'pending' ? 'bg-amber-400 dark:bg-amber-500 text-stone-900 font-bold' : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-600'
          }`}
        >
          {t('admin.pending') || 'Pending'}
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'approved' ? 'bg-amber-400 dark:bg-amber-500 text-stone-900 font-bold' : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-600'
          }`}
        >
          {t('admin.approved') || 'Approved'}
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'rejected' ? 'bg-amber-400 dark:bg-amber-500 text-stone-900 font-bold' : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-600'
          }`}
        >
          {t('admin.rejected') || 'Rejected'}
        </button>
      </div>

      {loading ? (
        <div className="rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-800 p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-amber-400 dark:border-amber-500 border-t-transparent mx-auto"></div>
        </div>
      ) : filteredVerifications.length === 0 ? (
        <div className="rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-800 p-8 text-center text-stone-500 dark:text-stone-400">{t('admin.noData')}</div>
      ) : (
        <div className="space-y-4">
          {filteredVerifications.map((verification) => (
            <div
              key={verification.id}
              className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-600 rounded-xl p-6 shadow-sm"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-stone-800 dark:text-white">
                    {verification.user?.name || 'Unknown User'}
                  </h3>
                  <p className="text-sm text-stone-600 dark:text-stone-300">{verification.user?.email}</p>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    Document Type: {verification.document_type === 'id_card' ? 'ID Card' : 'Passport'}
                  </p>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    Submitted: {new Date(verification.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadge(
                    verification.status
                  )}`}
                >
                  {verification.status.charAt(0).toUpperCase() + verification.status.slice(1)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="font-semibold mb-2 text-stone-700 dark:text-stone-200">Front Document / المستند الأمامي:</p>
                  {verification.document_front_url ? (
                    <div className="border border-stone-300 dark:border-stone-600 rounded-lg overflow-hidden bg-stone-50 dark:bg-stone-700/50">
                      <div
                        onClick={() => window.open(verification.document_front_url, '_blank', 'noopener,noreferrer')}
                        className="block cursor-pointer"
                      >
                        <img
                          src={verification.document_front_url}
                          alt="Front Document"
                          className="w-full h-auto max-h-64 object-contain bg-gray-50 hover:opacity-90 transition-opacity"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                        />
                        <div style={{ display: 'none' }} className="p-4 text-center text-gray-500">
                          <p>Unable to load image</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(verification.document_front_url, '_blank', 'noopener,noreferrer');
                            }}
                            className="text-blue-600 hover:underline mt-2 inline-block bg-transparent border-none cursor-pointer"
                          >
                            View Document
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">No document uploaded</p>
                  )}
                </div>
                <div>
                  <p className="font-semibold mb-2 text-stone-700 dark:text-stone-200">Back Document / المستند الخلفي:</p>
                  {verification.document_back_url ? (
                    <div className="border border-stone-300 dark:border-stone-600 rounded-lg overflow-hidden bg-stone-50 dark:bg-stone-700/50">
                      <div
                        onClick={() => window.open(verification.document_back_url, '_blank', 'noopener,noreferrer')}
                        className="block cursor-pointer"
                      >
                        <img
                          src={verification.document_back_url}
                          alt="Back Document"
                          className="w-full h-auto max-h-64 object-contain bg-gray-50 hover:opacity-90 transition-opacity"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                        />
                        <div style={{ display: 'none' }} className="p-4 text-center text-gray-500">
                          <p>Unable to load image</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(verification.document_back_url, '_blank', 'noopener,noreferrer');
                            }}
                            className="text-blue-600 hover:underline mt-2 inline-block bg-transparent border-none cursor-pointer"
                          >
                            View Document
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">No document uploaded</p>
                  )}
                </div>
              </div>

              {/* Manual Input Data */}
              <div className="mt-4 p-4 bg-stone-50 dark:bg-stone-700/50 rounded-lg">
                <h4 className="font-bold mb-3 text-stone-800 dark:text-white">Identity Information / معلومات الهوية</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-stone-700 dark:text-stone-200">Full Name / الاسم الكامل:</span>
                    <p className="text-stone-700 dark:text-stone-300">{verification.full_name || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-stone-700 dark:text-stone-200">Document Number / رقم المستند:</span>
                    <p className="text-stone-700 dark:text-stone-300">{verification.document_number || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-stone-700 dark:text-stone-200">Date of Birth / تاريخ الميلاد:</span>
                    <p className="text-stone-700 dark:text-stone-300">
                      {verification.date_of_birth 
                        ? new Date(verification.date_of_birth).toLocaleDateString() 
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-stone-700 dark:text-stone-200">Place of Birth / مكان الميلاد:</span>
                    <p className="text-stone-700 dark:text-stone-300">{verification.place_of_birth || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-stone-700 dark:text-stone-200">Nationality / الجنسية:</span>
                    <p className="text-stone-700 dark:text-stone-300">{verification.nationality || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-stone-700 dark:text-stone-200">Issue Date / تاريخ الإصدار:</span>
                    <p className="text-stone-700 dark:text-stone-300">
                      {verification.issue_date 
                        ? new Date(verification.issue_date).toLocaleDateString() 
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-stone-700 dark:text-stone-200">Expiry Date / تاريخ الانتهاء:</span>
                    <p className="text-stone-700 dark:text-stone-300">
                      {verification.expiry_date 
                        ? new Date(verification.expiry_date).toLocaleDateString() 
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <span className="font-semibold text-stone-700 dark:text-stone-200">Address / العنوان:</span>
                    <p className="text-stone-700 dark:text-stone-300">{verification.address || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {verification.admin_notes && (
                <div className="mb-4 p-3 bg-stone-50 dark:bg-stone-700/50 rounded-lg">
                  <p className="font-semibold mb-1 text-stone-800 dark:text-white">Admin Notes:</p>
                  <p className="text-sm text-stone-700 dark:text-stone-300">{verification.admin_notes}</p>
                </div>
              )}

              {verification.reviewed_by && (
                <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">
                  Reviewed by: {verification.reviewer?.name} on{' '}
                  {new Date(verification.reviewed_at).toLocaleDateString()}
                </p>
              )}

              <div className="flex gap-4 mt-4 flex-wrap">
                {verification.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApprove(verification.id)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setSelectedVerification({ ...verification, action: 'reject' })}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition"
                    >
                      Reject
                    </button>
                  </>
                )}
                
                {verification.status === 'approved' && (
                  <button
                    onClick={() => setSelectedVerification({ ...verification, action: 'rejectAfterApproval' })}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md transition"
                  >
                    Revoke Approval
                  </button>
                )}

                <button
                  onClick={() => handleDelete(verification.id)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition"
                >
                  Delete Record
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AdminPagination
        currentPage={pagination.current_page}
        lastPage={pagination.last_page}
        total={pagination.total}
        perPage={PER_PAGE}
        onPageChange={setPage}
      />

      {/* Reject Modal */}
      {selectedVerification && selectedVerification.action && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-600 rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto shadow-xl">
            <h3 className="font-bold text-lg mb-4 text-stone-800 dark:text-white">
              {selectedVerification.action === 'rejectAfterApproval' 
                ? 'Revoke Approval / إلغاء الموافقة' 
                : 'Reject Verification / رفض التحقق'}
            </h3>
            
            <div className="mb-4">
              <label className="block font-semibold text-sm mb-2 text-stone-700 dark:text-stone-200">
                Select Rejection Reason / اختر سبب الرفض:
              </label>
              <select
                value={selectedRejectionReason}
                onChange={(e) => {
                  setSelectedRejectionReason(e.target.value);
                  if (e.target.value !== 'other') {
                    setRejectNotes('');
                  }
                }}
                className="w-full border border-stone-300 dark:border-stone-600 dark:bg-stone-700 dark:text-white rounded-lg py-2 px-3 mb-2 outline-none focus:ring-2 focus:ring-amber-400/50"
              >
                <option value="">-- Select a reason / اختر سبب --</option>
                {rejectionReasons.map((reason) => (
                  <option key={reason.id} value={reason.id}>
                    {reason.en} / {reason.ar}
                  </option>
                ))}
              </select>
            </div>

            {selectedRejectionReason === 'other' && (
              <div className="mb-4">
                <label className="block font-semibold text-sm mb-2 text-stone-700 dark:text-stone-200">
                  Custom Reason / سبب مخصص:
                </label>
                <textarea
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  className="w-full border border-stone-300 dark:border-stone-600 dark:bg-stone-700 dark:text-white rounded-lg p-3 h-32 outline-none focus:ring-2 focus:ring-amber-400/50"
                  placeholder="Enter rejection reason... / أدخل سبب الرفض..."
                  required
                />
              </div>
            )}

            {selectedRejectionReason && selectedRejectionReason !== 'other' && (
              <div className="mb-4">
                <label className="block font-semibold text-sm mb-2 text-stone-700 dark:text-stone-200">
                  Additional Notes (Optional) / ملاحظات إضافية (اختياري):
                </label>
                <textarea
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  className="w-full border border-stone-300 dark:border-stone-600 dark:bg-stone-700 dark:text-white rounded-lg p-3 h-24 outline-none focus:ring-2 focus:ring-amber-400/50"
                  placeholder="Add any additional notes... / أضف أي ملاحظات إضافية..."
                />
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setSelectedVerification(null);
                  setRejectNotes('');
                  setSelectedRejectionReason('');
                }}
                className="flex-1 bg-stone-200 dark:bg-stone-600 hover:bg-stone-300 dark:hover:bg-stone-500 text-stone-800 dark:text-white px-4 py-2 rounded-lg transition"
              >
                Cancel / إلغاء
              </button>
              <button
                onClick={() => {
                  if (selectedVerification.action === 'rejectAfterApproval') {
                    handleRejectAfterApproval(selectedVerification.id);
                  } else {
                    handleReject(selectedVerification.id);
                  }
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition"
              >
                {selectedVerification.action === 'rejectAfterApproval' 
                  ? 'Confirm Revoke / تأكيد الإلغاء' 
                  : 'Confirm Reject / تأكيد الرفض'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default IdentityVerificationReview;

