import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUserContext } from '../contexts/UserContext';
import AxiosClient from '../AxiosClient';
import { usePopup } from '../contexts/PopupContext';
import { useLanguage } from '../contexts/LanguageContext';

function EstateCard({ estate, showSaveButton = true }) {
  const { user } = useUserContext();
  const { showToast } = usePopup();
  const { t } = useLanguage();
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && estate && showSaveButton) {
      checkIfSaved();
    }
  }, [user, estate, showSaveButton]);

  const checkIfSaved = () => {
    AxiosClient.get('/is-post-saved', {
      params: {
        post_id: estate.id,
        user_id: user.id
      }
    })
      .then((response) => {
        setIsSaved(response.data.saved || false);
      })
      .catch((error) => {
        console.error('Error checking if post is saved:', error);
      });
  };

  const handleSaveToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      showToast(t('apartments.loginToSave') || 'Please login to save posts', 'info');
      return;
    }

    if (saving) return;

    setSaving(true);

    try {
      if (isSaved) {
        // Unsave
        await AxiosClient.delete('/saved-posts', {
          data: {
            post_id: estate.id,
            user_id: user.id
          }
        });
        setIsSaved(false);
        showToast(t('apartments.postUnsaved') || 'Post removed from saved', 'success');
      } else {
        // Save
        await AxiosClient.post('/saved-posts', {
          post_id: estate.id,
          user_id: user.id
        });
        setIsSaved(true);
        showToast(t('apartments.postSaved') || 'Post saved successfully', 'success');
      }
    } catch (error) {
      console.error('Error toggling save:', error);
      if (error.response?.status === 403) {
        showToast(error.response.data.message || t('apartments.cannotSaveOwnPost') || "You can't save your own posts", 'error');
      } else {
        showToast(t('apartments.errorSaving') || 'Error saving post', 'error');
      }
    } finally {
      setSaving(false);
    }
  };
  
  // Get first image or use placeholder
  const getFirstImage = () => {
    if (!estate || !estate.images) {
      return '/placeholder-image.png';
    }
    
    if (Array.isArray(estate.images) && estate.images.length > 0) {
      const firstImg = estate.images[0];
      // Handle different possible structures
      // PostResource now returns: { Image_URL: "...", id: 1 }
      // But also handle legacy formats or Laravel serialization variations
      let imageUrl = null;
      
      if (typeof firstImg === 'string') {
        imageUrl = firstImg;
      } else if (firstImg && typeof firstImg === 'object') {
        // Try all possible field name variations
        imageUrl = firstImg.Image_URL || firstImg.image_url || firstImg.url || firstImg.ImageUrl || firstImg.imageUrl;
      }
      
      return imageUrl || '/placeholder-image.png';
    }
    
    return '/placeholder-image.png';
  };
  
  const firstImage = getFirstImage();
  const postUrl = estate?.id ? `/${estate.id}` : '#';
  
  return (
    <Link 
      to={postUrl}
      className="flex gap-5 items-center justify-start cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-3 rounded-lg transition-all duration-200 -m-3 block"
    >
      <div className="image w-2/5 h-48 md:h-48 max-md:h-32 flex-shrink-0">
        <img
          src={firstImage}
          alt={estate?.Title || 'Apartment'}
          className="rounded-md w-full h-full object-cover bg-gray-200"
          onError={(e) => {
            // Fallback to placeholder if image fails to load
            if (e.target.src !== '/placeholder-image.png') {
              e.target.src = '/placeholder-image.png';
            }
          }}
        />
      </div>
      <div className="content flex justify-between flex-col gap-2 flex-1 h-full">
        <h3 className="font-semibold text-lg text-[#444] dark:text-white transition duration-400 hover:text-black dark:hover:text-gray-300">
          {estate?.Title || 'Untitled'}
        </h3>
        <p className="font-light flex items-center gap-1 text-sm text-[#888] dark:text-gray-400">
          <img src="/public/pin.png" alt="" className="w-4" />
          {estate?.Address || 'Address not specified'}
        </p>
        <p className="bg-yellow-200 dark:bg-yellow-600 w-fit p-1 text-xl rounded-md dark:text-white">
          ${estate?.Price || 0}
        </p>
        <div className="flex justify-between gap-2">
          <div className="flex gap-4 text-sm">
            <span className="flex gap-1 bg-gray-200 dark:bg-gray-700 p-1 items-center rounded-md dark:text-gray-200">
              <img src="/public/bed.png" alt="" className="w-4" />
              {estate?.Bedrooms || 0}
              bedroom
            </span>
            <span className="flex gap-1 bg-gray-200 dark:bg-gray-700 p-1 items-center rounded-md dark:text-gray-200">
              <img src="/public/bath.png" alt="" className="w-4" />
              {estate?.Bathrooms || 0}
              bathroom
            </span>
          </div>
          {showSaveButton && (
            <div className="flex gap-3 items-center" onClick={(e) => e.preventDefault()}>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSaveToggle(e);
                }}
                disabled={saving}
                className={`border dark:border-gray-600 py-[5px] px-2 rounded-sm cursor-pointer transition ${
                  isSaved 
                    ? 'bg-yellow-300 dark:bg-yellow-500 hover:bg-yellow-400 dark:hover:bg-yellow-600' 
                    : 'hover:bg-gray-400 dark:hover:bg-gray-600'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={isSaved ? t('apartments.unsave') || 'Unsave' : t('apartments.save') || 'Save'}
              >
                <img 
                  src="/public/save.png" 
                  alt={isSaved ? t('apartments.unsave') || 'Unsave' : t('apartments.save') || 'Save'} 
                  className="w-4" 
                />
              </button>
              <div 
                className="border dark:border-gray-600 py-[5px] px-2 rounded-sm cursor-pointer hover:bg-gray-400 dark:hover:bg-gray-600 transition"
                onClick={(e) => e.preventDefault()}
              >
                <img src="/public/chat.png" alt="" className="w-4" />
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default EstateCard;
