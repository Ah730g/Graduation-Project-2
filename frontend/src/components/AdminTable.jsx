import { useLanguage } from '../contexts/LanguageContext';

function AdminTable({ columns, data, actions, loading, onRowClick, highlightedRowId }) {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-800 p-8 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-amber-400 dark:border-amber-500 border-t-transparent mx-auto mb-2" />
        <p className="text-stone-500 dark:text-stone-400">{t('common.loading')}</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-800 p-8 text-center">
        <p className="text-stone-500 dark:text-stone-400">{t('admin.noData')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-800 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-stone-100 dark:bg-stone-700">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-left font-semibold text-stone-700 dark:text-stone-200">
                  {col.label}
                </th>
              ))}
              {actions && (
                <th className="px-4 py-3 text-left font-semibold text-stone-700 dark:text-stone-200">
                  {t('admin.actions')}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => {
              const isHighlighted = highlightedRowId && row.id === parseInt(highlightedRowId);
              return (
                <tr
                  key={row.id || index}
                  id={isHighlighted ? `row-${row.id}` : undefined}
                  className={`border-b border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700/50 ${onRowClick ? 'cursor-pointer' : ''} ${
                    isHighlighted ? 'bg-amber-100 dark:bg-amber-900/40 animate-pulse' : ''
                  }`}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-sm text-stone-700 dark:text-stone-200">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {actions(row).map((action, idx) => (
                          <button
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              action.onClick();
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition hover:opacity-90 ${
                              action.variant === 'danger'
                                ? 'bg-red-500 dark:bg-red-600 text-white'
                                : action.variant === 'success'
                                ? 'bg-green-500 dark:bg-green-600 text-white'
                                : action.variant === 'info'
                                ? 'bg-blue-500 dark:bg-blue-600 text-white'
                                : 'bg-amber-400 dark:bg-amber-500 text-stone-900'
                            }`}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminTable;

