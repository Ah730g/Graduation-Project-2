import { useEffect, useState } from "react";
import AdminTable from "../components/AdminTable";
import AdminPagination, { PER_PAGE } from "../components/AdminPagination";
import UserDetailsModal from "../components/UserDetailsModal";
import AxiosClient from "../AxiosClient";
import { useUserContext } from "../contexts/UserContext";
import { useLanguage } from "../contexts/LanguageContext";
import { usePopup } from "../contexts/PopupContext";

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const { setMessage } = useUserContext();
  const { t, translateRole, translateStatus, language } = useLanguage();
  const { showConfirm, showPrompt } = usePopup();

  useEffect(() => {
    fetchUsers();
  }, [page]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchUsers();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const fetchUsers = () => {
    setLoading(true);
    const params = { page, per_page: PER_PAGE };
    if (searchTerm) params.search = searchTerm;
    AxiosClient.get("/admin/users", { params })
      .then((response) => {
        const res = response.data;
        setUsers(res.data || []);
        setPagination({
          current_page: res.current_page ?? 1,
          last_page: res.last_page ?? 1,
          total: res.total ?? 0,
        });
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching users:", error);
        setLoading(false);
      });
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === "active" ? "disabled" : "active";
    
    // If disabling, ask for reason
    let reason = null;
    if (newStatus === "disabled") {
      reason = await showPrompt({
        title: t("admin.disableUser") || "Disable User",
        message: t("admin.reasonForDisabling") || "Please provide a reason for disabling this user:",
        placeholder: t("admin.enterReason") || "Enter reason...",
        confirmText: t("admin.disable") || "Disable",
        cancelText: t("admin.cancel") || "Cancel",
        required: true,
        variant: "warning",
      });
      
      if (!reason) {
        return; // User cancelled
      }
    }
    
    AxiosClient.patch(`/admin/users/${user.id}/status`, { 
      status: newStatus,
      reason: reason 
    })
      .then(() => {
        setMessage(
          t("admin.user") +
            " " +
            (newStatus === "active"
              ? t("admin.enabled")
              : t("admin.disabled")) +
            " " +
            t("common.success")
        );
        fetchUsers();
      })
      .catch((error) => {
        console.error("Error updating user status:", error);
        const errorMessage = error.response?.data?.message || t("admin.errorUpdatingStatus");
        setMessage(errorMessage, "error");
      });
  };

  const handleDelete = async (user) => {
    // First: Fetch user details to show stats
    let userStats = null;
    try {
      const detailsResponse = await AxiosClient.get(`/admin/users/${user.id}`);
      userStats = detailsResponse.data.stats;
    } catch (error) {
      console.error("Error fetching user details:", error);
    }

    // First confirmation with stats
    const confirmed = await showConfirm({
      title: t("admin.delete") + " " + t("admin.user"),
      message: userStats 
        ? `${t("admin.delete")} ${t("admin.user")} "${user.name}"?\n\n${t("admin.thisWillDelete")}:\n• ${userStats.total_posts || 0} ${t("admin.posts")}\n• ${userStats.total_contracts || 0} ${t("admin.contracts")}\n• ${userStats.total_rental_requests || 0} ${t("admin.rentalRequests")}\n• ${userStats.total_reviews || 0} ${t("admin.reviews")}\n• ${userStats.total_saved_posts || 0} ${t("admin.savedPosts")}\n\n${t("admin.thisActionCannotBeUndone")}`
        : `${t("admin.delete")} ${t("admin.user")} "${user.name}"?`,
      confirmText: t("admin.continue") || "Continue",
      cancelText: t("admin.cancel"),
      variant: "warning",
    });

    if (!confirmed) return;

    // Ask for reason
    const reason = await showPrompt({
      title: t("admin.deleteUser") || "Delete User",
      message: t("admin.reasonForDeleting") || "Please provide a reason for deleting this user:",
      placeholder: t("admin.enterReason") || "Enter reason...",
      confirmText: t("admin.continue") || "Continue",
      cancelText: t("admin.cancel") || "Cancel",
      required: true,
      variant: "danger",
    });

    if (!reason) return;

    // Final confirmation
    const finalConfirm = await showConfirm({
      title: t("admin.finalConfirmation") || "Final Confirmation",
      message: t("admin.deleteUserFinalWarning") || 
        "Are you absolutely sure you want to permanently delete this user? This action cannot be undone.",
      confirmText: t("admin.delete") || "Delete",
      cancelText: t("admin.cancel") || "Cancel",
      variant: "danger",
    });

    if (finalConfirm) {
      AxiosClient.delete(`/admin/users/${user.id}`, { 
        data: { reason } 
      })
        .then((response) => {
          setMessage(
            t("admin.user") +
              " " +
              t("admin.deleted") +
              " " +
              t("common.success")
          );
          fetchUsers();
        })
        .catch((error) => {
          console.error("Error deleting user:", error);
          const errorMessage = error.response?.data?.message || t("admin.errorDeletingUser");
          setMessage(errorMessage, "error");
        });
    }
  };

  const handleViewDetails = (user) => {
    setSelectedUserId(user.id);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedUserId(null);
  };

  const handleModalUpdate = () => {
    fetchUsers();
  };

  const columns = [
    { key: "name", label: t("admin.name") },
    { key: "email", label: t("admin.email") },
    {
      key: "role",
      label: t("admin.role"),
      render: (value) => (
        <span className="bg-stone-200 dark:bg-stone-600 text-stone-800 dark:text-stone-200 px-2 py-1 rounded-lg text-sm">
          {translateRole(value)}
        </span>
      ),
    },
    {
      key: "status",
      label: t("admin.status"),
      render: (value) => (
        <span
          className={`px-2 py-1 rounded-lg text-sm ${
            value === "active"
              ? "bg-green-200 dark:bg-green-900/50 text-green-800 dark:text-green-200"
              : "bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-200"
          }`}
        >
          {translateStatus(value)}
        </span>
      ),
    },
  ];

  const actions = (user) => [
    {
      label: t("admin.viewDetails"),
      onClick: () => handleViewDetails(user),
      variant: "default",
    },
    {
      label: user.status === "active" ? t("admin.disable") : t("admin.enable"),
      onClick: () => handleToggleStatus(user),
      variant: user.status === "active" ? "default" : "success",
    },
    {
      label: t("admin.delete"),
      onClick: () => handleDelete(user),
      variant: "danger",
    },
  ];

  return (
    <div className="px-5 mx-auto max-w-[1366px] dark:bg-stone-900">
      <h1 className="text-3xl font-bold text-stone-800 dark:text-stone-100 mb-8">
        {t("admin.userManagement")}
      </h1>
      <div className="mb-6">
        <input
          type="text"
          placeholder={t("admin.searchUsers") || "Search by name, email, national ID, or identity name..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full max-w-md border border-stone-300 dark:border-stone-600 dark:bg-stone-800 dark:text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-amber-400/50 placeholder-stone-400 ${
            language === 'ar' ? 'text-right' : 'text-left'
          }`}
        />
      </div>
      <AdminTable
        columns={columns}
        data={users}
        actions={actions}
        loading={loading}
      />
      <AdminPagination
        currentPage={pagination.current_page}
        lastPage={pagination.last_page}
        total={pagination.total}
        perPage={PER_PAGE}
        onPageChange={setPage}
      />
      <UserDetailsModal
        userId={selectedUserId}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onUpdate={handleModalUpdate}
      />
    </div>
  );
}

export default UserManagement;
