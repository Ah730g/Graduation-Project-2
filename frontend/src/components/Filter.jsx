import React from 'react';
import AxiosClient from '../AxiosClient';
import { usePostContext } from '../contexts/PostContext';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const DURATION_TYPES = ['day', 'week', 'month', 'year'];

function Filter({ properties, loading, onFilterChange }) {
  const { setPosts, setPagination } = usePostContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useLanguage();
  const durationTypeFromUrl = searchParams.get('duration_type') || 'month';

  const onSubmit = (e) => {
    e.preventDefault();
    const inputs = new FormData(e.target);
    const data = Object.fromEntries(inputs);
    const payload = {
      type: data.type,
      duration_type: data.duration_type || 'month',
      min: data.min,
      max: data.max,
      location: data.location,
      bedroom: data.bedroom,
      property: data.property,
      page: 1, // Reset to first page when filtering
      per_page: 10,
    };
    
    // Update URL params
    const newParams = new URLSearchParams();
    if (payload.location) newParams.set('location', payload.location);
    if (payload.type) newParams.set('type', payload.type);
    if (payload.duration_type) newParams.set('duration_type', payload.duration_type);
    if (payload.min) newParams.set('min', payload.min);
    if (payload.max) newParams.set('max', payload.max);
    if (payload.bedroom) newParams.set('bedroom', payload.bedroom);
    if (payload.property) newParams.set('property', payload.property);
    newParams.set('page', '1');
    setSearchParams(newParams);
    
    loading(true);
    AxiosClient.get('/post', { params: payload })
      .then((response) => {
        setPosts(response.data.data || []);
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
        loading(false);
        if (onFilterChange) onFilterChange();
      })
      .catch((error) => {
        console.log(error);
        loading(false);
      });
  };

  return (
    <form onSubmit={onSubmit} className="bg-white dark:bg-stone-800/80 border border-stone-200 dark:border-stone-600 rounded-xl p-4 md:p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-stone-800 dark:text-white mb-4">
        {t('search.filterTitle') || 'Refine search'}
      </h2>
      <div className="top flex flex-col gap-2 mb-4">
        <label htmlFor="city" className="text-sm font-medium text-stone-600 dark:text-stone-300">
          {t('search.location')}
        </label>
        <input
          type="text"
          id="city"
          placeholder={t('search.locationPlaceholder') || 'City or area'}
          className="py-2.5 px-3 border border-stone-300 dark:border-stone-600 dark:bg-stone-800 dark:text-white outline-none rounded-lg focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition"
          name="location"
        />
      </div>
      <div className="bottom flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="type" className="text-sm font-medium text-stone-600 dark:text-stone-300">
            {t('search.type') || 'Type'}
          </label>
          <select
            name="type"
            id="type"
            className="min-w-[100px] py-2.5 px-3 border border-stone-300 dark:border-stone-600 dark:bg-stone-800 dark:text-white outline-none rounded-lg focus:ring-2 focus:ring-amber-400/50 transition"
          >
            <option value="">{t('search.any') || 'Any'}</option>
            <option value="rent">{t('search.rent')}</option>
            <option value="buy">{t('search.buy')}</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="property" className="text-sm font-medium text-stone-600 dark:text-stone-300">
            {t('search.property') || 'Property'}
          </label>
          <select
            id="property"
            name="property"
            className="min-w-[100px] py-2.5 px-3 border border-stone-300 dark:border-stone-600 dark:bg-stone-800 dark:text-white outline-none rounded-lg focus:ring-2 focus:ring-amber-400/50 transition"
          >
            {properties && properties.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="duration_type" className="text-sm font-medium text-stone-600 dark:text-stone-300">
            {t('search.filterByDuration')}
          </label>
          <select
            id="duration_type"
            name="duration_type"
            defaultValue={durationTypeFromUrl}
            className="min-w-[100px] py-2.5 px-3 border border-stone-300 dark:border-stone-600 dark:bg-stone-800 dark:text-white outline-none rounded-lg focus:ring-2 focus:ring-amber-400/50 transition"
          >
            {DURATION_TYPES.map((d) => (
              <option key={d} value={d}>{t(`search.duration.${d}`) || d}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="minPrice" className="text-sm font-medium text-stone-600 dark:text-stone-300">
            {t('search.minPrice')}
          </label>
          <input
            type="number"
            id="minPrice"
            placeholder="—"
            className="w-24 py-2.5 px-3 border border-stone-300 dark:border-stone-600 dark:bg-stone-800 dark:text-white outline-none rounded-lg focus:ring-2 focus:ring-amber-400/50 transition"
            name="min"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="maxPrice" className="text-sm font-medium text-stone-600 dark:text-stone-300">
            {t('search.maxPrice')}
          </label>
          <input
            type="number"
            id="maxPrice"
            placeholder="—"
            className="w-24 py-2.5 px-3 border border-stone-300 dark:border-stone-600 dark:bg-stone-800 dark:text-white outline-none rounded-lg focus:ring-2 focus:ring-amber-400/50 transition"
            name="max"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bedroom" className="text-sm font-medium text-stone-600 dark:text-stone-300">
            {t('search.bedrooms') || 'Bedrooms'}
          </label>
          <input
            type="number"
            id="bedroom"
            placeholder="—"
            className="w-24 py-2.5 px-3 border border-stone-300 dark:border-stone-600 dark:bg-stone-800 dark:text-white outline-none rounded-lg focus:ring-2 focus:ring-amber-400/50 transition"
            name="bedroom"
          />
        </div>
        <button
          type="submit"
          className="flex items-center justify-center gap-2 bg-[#fece51] dark:bg-amber-500 hover:bg-[#e0ab25] dark:hover:bg-amber-600 text-stone-900 dark:text-white font-medium py-2.5 px-6 rounded-lg transition shadow-sm min-h-[42px]"
        >
          <img src="/public/search.png" alt="" className="w-5 h-5" />
          <span>{t('search.search') || 'Search'}</span>
        </button>
      </div>
    </form>
  );
}

export default Filter;
