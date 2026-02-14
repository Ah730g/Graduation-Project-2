import React, { useState } from 'react';
import AxiosClient from '../AxiosClient';
import { useNavigate } from 'react-router-dom';
import { usePostContext } from '../contexts/PostContext';
import { useLanguage } from '../contexts/LanguageContext';

const DURATION_TYPES = ['day', 'week', 'month', 'year'];

function Searchbar() {
  const [type, setType] = useState('rent');
  const [durationType, setDurationType] = useState('month');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setPosts, setPagination } = usePostContext();
  const { t } = useLanguage();

  const onsubmit = (e) => {
    e.preventDefault();
    const inputs = new FormData(e.currentTarget);
    const filters = Object.fromEntries(inputs);
    const payload = {
      type: type,
      duration_type: filters.duration_type || durationType,
      min: filters.min,
      max: filters.max,
      location: filters.location,
      page: 1,
      per_page: 10,
    };
    setLoading(true);
    AxiosClient.get('/post', { params: payload }).then((response) => {
      setPosts(response.data.data || []);
      if (response.data.pagination) {
        setPagination(response.data.pagination);
      }
      setLoading(false);
      // Navigate with all filter params in URL so ListPage can use them for pagination and refetch
      const params = new URLSearchParams({ page: '1' });
      if (type) params.set('type', type);
      if (payload.duration_type) params.set('duration_type', payload.duration_type);
      if (filters.location?.trim()) params.set('location', filters.location.trim());
      if (filters.min?.trim()) params.set('min', filters.min.trim());
      if (filters.max?.trim()) params.set('max', filters.max.trim());
      navigate(`/list?${params.toString()}`);
    }).catch((error) => {
      console.error('Search error:', error);
      setLoading(false);
    });
  };

  const { language } = useLanguage();
  
  return (
    <div className={`relative z-10 ${language === 'ar' ? 'lg:pr-24' : 'lg:pl-24'}`}>
      <div className="inline-flex rounded-t-xl overflow-hidden border border-stone-300 dark:border-stone-600 border-b-0">
        <button
          type="button"
          className={`px-8 py-3.5 text-sm font-medium transition ${type === 'buy' ? 'bg-stone-800 dark:bg-stone-700 text-white' : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-700/50'}`}
          onClick={() => setType('buy')}
        >
          {t('search.buy')}
        </button>
        <button
          type="button"
          className={`px-8 py-3.5 text-sm font-medium transition ${type === 'rent' ? 'bg-stone-800 dark:bg-stone-700 text-white' : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-700/50'}`}
          onClick={() => setType('rent')}
        >
          {t('search.rent')}
        </button>
      </div>
      <form
        onSubmit={onsubmit}
        className="flex flex-wrap items-stretch gap-0 rounded-b-xl rounded-tr-xl md:rounded-tr-none md:rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 shadow-sm overflow-hidden max-md:flex-col"
      >
        <input
          type="text"
          placeholder={t('search.location')}
          className="flex-1 min-w-[120px] py-3.5 px-4 outline-none border-stone-200 dark:border-stone-600 dark:bg-stone-800 dark:text-white placeholder-stone-400 focus:ring-2 focus:ring-amber-400/30 max-md:border-b max-md:rounded-none"
          name="location"
        />
        <select
          name="duration_type"
          value={durationType}
          onChange={(e) => setDurationType(e.target.value)}
          className="w-[110px] py-3.5 px-3 outline-none border-l border-stone-200 dark:border-stone-600 dark:bg-stone-800 dark:text-white focus:ring-2 focus:ring-amber-400/30 max-md:w-full max-md:border-l-0 max-md:border-b"
          title={t('search.filterByDuration')}
        >
          {DURATION_TYPES.map((d) => (
            <option key={d} value={d}>{t(`search.duration.${d}`) || d}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder={t('search.minPrice')}
          className="w-[120px] py-3.5 px-3 outline-none border-l border-stone-200 dark:border-stone-600 dark:bg-stone-800 dark:text-white placeholder-stone-400 focus:ring-2 focus:ring-amber-400/30 max-md:w-full max-md:border-l-0 max-md:border-b"
          name="min"
        />
        <input
          type="number"
          placeholder={t('search.maxPrice')}
          className="w-[120px] py-3.5 px-3 outline-none border-l border-stone-200 dark:border-stone-600 dark:bg-stone-800 dark:text-white placeholder-stone-400 focus:ring-2 focus:ring-amber-400/30 max-md:w-full max-md:border-l-0 max-md:border-b"
          name="max"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 bg-[#fece51] dark:bg-amber-500 hover:bg-[#e0ab25] dark:hover:bg-amber-600 text-stone-900 dark:text-white font-medium py-3.5 px-6 transition disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
        >
          <img src="/public/search.png" alt="" className="w-5 h-5" />
          <span className="max-md:hidden">{t('search.search')}</span>
        </button>
      </form>
    </div>
  );
}

export default Searchbar;
