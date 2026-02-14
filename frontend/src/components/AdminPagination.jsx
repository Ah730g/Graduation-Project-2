import { useLanguage } from '../contexts/LanguageContext';

const PER_PAGE = 10;

function AdminPagination({ currentPage, lastPage, total, perPage = PER_PAGE, onPageChange }) {
  const { t, language } = useLanguage();
  const isRtl = language === 'ar';

  if (!lastPage || lastPage <= 1) return null;

  const from = (currentPage - 1) * perPage + 1;
  const to = Math.min(currentPage * perPage, total);

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 mt-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
      <p className="text-sm text-[#666] dark:text-stone-400">
        {t('admin.pagination.showing')} {from}-{to} {t('admin.pagination.of')} {total} {t('admin.pagination.entries')}
      </p>
      <div className={`flex items-center gap-1 ${isRtl ? 'flex-row-reverse' : ''}`}>
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-3 py-1.5 rounded-md text-sm font-medium bg-gray-200 dark:bg-stone-700 text-[#444] dark:text-stone-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-stone-600"
        >
          {t('admin.pagination.previous')}
        </button>
        <span className="px-2 text-sm text-[#666] dark:text-stone-400">
          {t('admin.pagination.page')} {currentPage} / {lastPage}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= lastPage}
          className="px-3 py-1.5 rounded-md text-sm font-medium bg-gray-200 dark:bg-stone-700 text-[#444] dark:text-stone-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-stone-600"
        >
          {t('admin.pagination.next')}
        </button>
      </div>
    </div>
  );
}

export default AdminPagination;
export { PER_PAGE };
