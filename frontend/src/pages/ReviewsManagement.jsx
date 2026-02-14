import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AdminTable from "../components/AdminTable";
import AdminPagination, { PER_PAGE } from "../components/AdminPagination";
import AxiosClient from "../AxiosClient";
import { useUserContext } from "../contexts/UserContext";
import { useLanguage } from "../contexts/LanguageContext";
import { usePopup } from "../contexts/PopupContext";

function ReviewsManagement() {
  const { t, translateStatus } = useLanguage();
  const [searchParams] = useSearchParams();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const { setMessage } = useUserContext();
  const { showConfirm } = usePopup();
  const highlightedId = searchParams.get('reviewId');
  const [resolvedHighlightPage, setResolvedHighlightPage] = useState(!searchParams.get('reviewId'));

  useEffect(() => {
    if (!highlightedId) {
      setResolvedHighlightPage(true);
      return;
    }
    AxiosClient.get(`/admin/reviews/page-for-id/${highlightedId}`, { params: { per_page: PER_PAGE } })
      .then((r) => {
        setPage(r.data.page);
        setResolvedHighlightPage(true);
      })
      .catch(() => setResolvedHighlightPage(true));
  }, [highlightedId]);

  useEffect(() => {
    if (!resolvedHighlightPage) return;
    fetchReviews();
  }, [page, resolvedHighlightPage]);

  useEffect(() => {
    if (highlightedId && reviews.length > 0) {
      setTimeout(() => {
        const element = document.getElementById(`row-${highlightedId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [highlightedId, reviews]);

  const fetchReviews = () => {
    setLoading(true);
    AxiosClient.get("/admin/reviews", { params: { page, per_page: PER_PAGE } })
      .then((response) => {
        const res = response.data;
        setReviews(res.data || []);
        setPagination({
          current_page: res.current_page ?? 1,
          last_page: res.last_page ?? 1,
          total: res.total ?? 0,
        });
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching reviews:", error);
        setLoading(false);
      });
  };

  const handleDelete = async (review) => {
    const confirmed = await showConfirm({
      title: t("admin.remove") + " " + t("admin.reviews"),
      message: t("admin.remove") + " " + t("admin.reviews") + "?",
      confirmText: t("admin.remove"),
      cancelText: t("admin.cancel"),
      variant: "danger",
    });

    if (confirmed) {
      AxiosClient.delete(`/admin/reviews/${review.id}`)
        .then(() => {
          setMessage(
            t("admin.reviews") +
              " " +
              t("admin.removed") +
              " " +
              t("common.success")
          );
          fetchReviews();
        })
        .catch((error) => {
          console.error("Error removing review:", error);
          setMessage(t("admin.errorRemovingReview"), "error");
        });
    }
  };

  const columns = [
    {
      key: "user",
      label: t("admin.reviewer"),
      render: (value, row) => (row.user ? row.user.name : "N/A"),
    },
    {
      key: "post",
      label: t("admin.apartment"),
      render: (value, row) => (row.post ? row.post.Title : "N/A"),
    },
    {
      key: "rating",
      label: t("admin.rating"),
      render: (value) => (
        <span className="bg-amber-200 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 px-2 py-1 rounded-lg text-sm">
          {"⭐".repeat(value)} ({value}/5)
        </span>
      ),
    },
    {
      key: "comment",
      label: t("admin.comment"),
      render: (value) =>
        value
          ? value.length > 50
            ? value.substring(0, 50) + "..."
            : value
          : "N/A",
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

  const actions = (review) => [
    {
      label: t("admin.remove"),
      onClick: () => handleDelete(review),
      variant: "danger",
    },
  ];

  return (
    <div className="px-5 mx-auto max-w-[1366px] dark:bg-stone-900">
      <h1 className="text-3xl font-bold text-stone-800 dark:text-stone-100 mb-8">
        {t("admin.reviews")}
      </h1>
      <AdminTable
        columns={columns}
        data={reviews}
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

export default ReviewsManagement;
