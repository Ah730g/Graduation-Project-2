import React, { useEffect, useState } from "react";
import AxiosClient from "../AxiosClient";
import { useUserContext } from "../contexts/UserContext";
import UploadWidget from "../components/UploadWidget";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { usePopup } from "../contexts/PopupContext";

function AddPost() {
  const [properties, setProperties] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState(null);
  const { user, refreshUser } = useUserContext();
  const [lat, setLat] = useState("");
  const [len, setLen] = useState("");
  const [avatarURL, setAvatarURL] = useState([]);
  const [imagesUploading, setImagesUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitKind, setSubmitKind] = useState(null); // 'create' | 'update' | 'draft_create' | 'draft_update'
  const [isEditing, setIsEditing] = useState(false);
  const [postId, setPostId] = useState(null);
  const [postData, setPostData] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, language } = useLanguage();
  const { showToast } = usePopup();
  const [durationPrices, setDurationPrices] = useState([]);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    // Check if editing
    const editId = searchParams.get('edit');
    if (editId) {
      setIsEditing(true);
      setPostId(editId);
      // Fetch post data
      AxiosClient.get(`/post/${editId}`)
        .then((response) => {
          const post = response.data.post || response.data;
          setPostData(post);
          // Fill form with existing data
          setLat(post.latitude || "");
          setLen(post.longitude || "");
          if (post.images && post.images.length > 0) {
            const imageUrls = post.images.map(img => img.Image_URL || img.image_url || img);
            setAvatarURL(imageUrls);
          }
          // Load duration prices if they exist
          if (post.duration_prices && post.duration_prices.length > 0) {
            setDurationPrices(post.duration_prices.map(dp => ({
              duration_type: dp.duration_type,
              price: dp.price,
            })));
          }
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching post:", error);
          showToast(t("apartments.errorLoading") || "Error loading post", "error");
          navigate("/about");
        });
    } else {
      const checkIdentityAndContinue = async () => {
        if (user && user.identity_status !== "approved") {
          await refreshUser();
          try {
            const identityResponse = await AxiosClient.get("/identity-verification");
            const identityStatus = identityResponse.data?.identity_status;
            if (identityStatus === "approved") {
              setLoading(false);
              return;
            }
          } catch (error) {
            console.error("Error checking identity status:", error);
          }
          const refreshedUser = JSON.parse(localStorage.getItem("user"));
          if (!refreshedUser || refreshedUser.identity_status !== "approved") {
            navigate("/identity-verification");
            return;
          }
        }
        setLoading(false);
      };
      checkIdentityAndContinue();
    }

    AxiosClient.get("/property").then((response) => {
      setProperties(response.data);
    });
  }, [user, refreshUser, navigate, searchParams, showToast, t]);
  const buildPayload = (formData) => {
    const inputs = Object.fromEntries(formData);
    return {
      user_id: user.id,
      title: inputs["title"] || null,
      price: inputs["price"] ? parseInt(inputs["price"]) : null,
      address: inputs.address || null,
      description: inputs["des"] || null,
      city: inputs["city"] || null,
      bedrooms: inputs["bed-num"] ? parseInt(inputs["bed-num"]) : null,
      bathrooms: inputs["bath-num"] ? parseInt(inputs["bath-num"]) : null,
      latitude: lat || null,
      longitude: len || null,
      type: inputs["type"] || null,
      porperty_id: inputs["prop"] ? parseInt(inputs["prop"]) : null,
      utilities_policy: inputs["utl-policy"] || null,
      pet_policy: inputs["pet-policy"] == "true",
      income_policy: inputs["income-policy"] || null,
      total_size: inputs["total-size"] ? parseInt(inputs["total-size"]) : null,
      bus: inputs["bus"] ? parseInt(inputs["bus"]) : null,
      resturant: inputs["resturant"] ? parseInt(inputs["resturant"]) : null,
      school: inputs["school"] ? parseInt(inputs["school"]) : null,
      images: avatarURL || [],
      duration_prices: durationPrices.filter(dp => dp.duration_type && dp.price > 0),
    };
  };

  // Map backend field names to frontend input names
  const getFieldError = (fieldName) => {
    if (!errors) return null;
    
    // Map frontend field names to backend field names
    const fieldMap = {
      'title': 'title',
      'price': 'price',
      'address': 'address',
      'des': 'description',
      'city': 'city',
      'bed-num': 'bedrooms',
      'bath-num': 'bathrooms',
      'lat': 'latitude',
      'len': 'longitude',
      'type': 'type',
      'prop': 'porperty_id',
      'utl-policy': 'utilities_policy',
      'pet-policy': 'pet_policy',
      'income-policy': 'income_policy',
      'total-size': 'total_size',
      'bus': 'bus',
      'resturant': 'resturant',
      'school': 'school',
    };
    
    const backendFieldName = fieldMap[fieldName];
    if (backendFieldName && errors[backendFieldName]) {
      return errors[backendFieldName][0];
    }
    
    return null;
  };

  const countFilledFields = (payload) => {
    let count = 0;
    const fieldsToCheck = [
      'title', 'price', 'address', 'description', 'city',
      'bedrooms', 'bathrooms', 'latitude', 'longitude', 'type',
      'porperty_id', 'utilities_policy', 'income_policy', 'total_size',
      'bus', 'resturant', 'school'
    ];
    
    fieldsToCheck.forEach(field => {
      if (payload[field] !== null && payload[field] !== undefined && payload[field] !== '') {
        count++;
      }
    });
    
    // Check images array
    if (payload.images && Array.isArray(payload.images) && payload.images.length > 0) {
      count++;
    }
    
    return count;
  };

  const onSubmit = (e, isDraft = false) => {
    e.preventDefault();

    if (submitting) return;

    if (imagesUploading) {
      showToast("Please wait for images to finish uploading", "warning");
      return;
    }

    setSubmitting(true);
    setSubmitKind(
      isEditing
        ? (isDraft ? "draft_update" : "update")
        : (isDraft ? "draft_create" : "create")
    );
    
    // Get form element - could be from form submit or button click
    const form = e.target.tagName === 'FORM' ? e.target : e.currentTarget.closest('form') || e.currentTarget.form;
    
    if (!form) {
      setErrors({
        general: ['Form not found']
      });
      setSubmitting(false);
      setSubmitKind(null);
      return;
    }
    
    const formData = new FormData(form);
    const payload = {
      ...buildPayload(formData),
      is_draft: isDraft,
    };
    
    setErrors(null);
    
    // For drafts, check if at least 4 fields are filled
    if (isDraft) {
      const filledFieldsCount = countFilledFields(payload);
      if (filledFieldsCount < 4) {
        setErrors({
          general: [t('apartments.minFieldsRequired') || 'Please fill at least 4 fields to save as draft']
        });
        setSubmitting(false);
        setSubmitKind(null);
        return;
      }
    }
    const apiCall = isEditing 
      ? AxiosClient.put(`/post/${postId}`, payload)
      : AxiosClient.post("/post", payload);
    
    apiCall
      .then((response) => {
        console.log(response);
        if (isEditing) {
          if (isDraft) {
            showToast(t("apartments.draftSaved") || "Draft updated successfully", "success");
          } else {
            showToast(t("apartments.apartmentUpdated") || "Apartment updated successfully", "success");
          }
          navigate("/about");
        } else {
          if (isDraft) {
            showToast(t("apartments.draftSaved"), "success");
            navigate("/about");
          } else {
            showToast(t("apartments.apartmentCreated"), "success");
            navigate("/");
          }
        }
      })
      .catch((error) => {
        if (
          error.response?.status === 403 &&
          error.response?.data?.message?.includes("Identity verification")
        ) {
          // Identity verification required
          navigate("/identity-verification");
          return;
        }
        setErrors(
          error.response?.data?.errors || {
            general: [error.response?.data?.message || "Failed to create post"],
          }
        );
      })
      .finally(() => {
        setSubmitting(false);
        setSubmitKind(null);
      });
  };
  const handleLocation = () => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      const msg = t("addPost.geolocationNotSupported");
      showToast(
        msg && msg !== "addPost.geolocationNotSupported" 
          ? msg 
          : "Geolocation is not supported by your browser", 
        "error"
      );
      return;
    }

    setGettingLocation(true);

    // Get current position with options for better accuracy
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        
        // Convert to string and set with proper precision (6 decimal places for accuracy)
        setLat(latitude.toFixed(6));
        setLen(longitude.toFixed(6));
        
        setGettingLocation(false);
        const successMsg = t("addPost.locationRetrieved");
        showToast(
          successMsg && successMsg !== "addPost.locationRetrieved"
            ? successMsg
            : `Location retrieved: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          "success"
        );
      },
      (error) => {
        setGettingLocation(false);
        let errorMessage = "Error getting your location";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            const deniedMsg = t("addPost.locationPermissionDenied");
            errorMessage = deniedMsg && deniedMsg !== "addPost.locationPermissionDenied"
              ? deniedMsg
              : "Location access denied. Please enable location permissions in your browser settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            const unavailableMsg = t("addPost.locationUnavailable");
            errorMessage = unavailableMsg && unavailableMsg !== "addPost.locationUnavailable"
              ? unavailableMsg
              : "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            const timeoutMsg = t("addPost.locationTimeout");
            errorMessage = timeoutMsg && timeoutMsg !== "addPost.locationTimeout"
              ? timeoutMsg
              : "The request to get your location timed out.";
            break;
          default:
            const errorMsg = t("addPost.locationError");
            errorMessage = errorMsg && errorMsg !== "addPost.locationError"
              ? errorMsg
              : "An unknown error occurred while getting your location.";
            break;
        }
        
        console.error("Error getting location:", error);
        showToast(errorMessage, "error");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  return (
    <div
      className="px-5 mx-auto max-w-[1366px] max-md:max-w-[640px] max-lg:max-w-[768px] max-xl:max-w-[1280px]
     lg:flex lg:justify-between h-[calc(100vh-100px)] overflow-hidden"
    >
      <div className={`inputs lg:w-3/5 flex flex-col gap-12 mb-3 overflow-y-scroll relative ${
        language === 'ar' ? 'lg:pl-10' : 'lg:pr-10'
      }`}>
        <h2 className="font-bold text-3xl">{t("addPost.title")}</h2>
        {errors && errors.general && (
          <div className="bg-red-500 text-white p-3 rounded-md">
            {errors.general.map((error, i) => {
              return <p key={i}>{error}</p>;
            })}
          </div>
        )}
        {loading ? (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-300 mx-auto"></div>
          </div>
        ) : (
          <form
            className="items flex gap-y-5 gap-x-2 justify-between flex-wrap items-center"
            onSubmit={onSubmit}
          >
            <div className="title-item flex flex-col">
              <label htmlFor="title" className="font-semibold text-sm">
                {t("addPost.titleLabel")}
              </label>
              <input
                type="text"
                name="title"
                id="title"
                defaultValue={postData?.Title || ""}
                className={`border outline-none py-5 px-3 rounded-md w-[230px] ${getFieldError('title') ? 'border-red-500' : 'border-black'}`}
              />
              {getFieldError('title') && (
                <span className="text-red-500 text-xs mt-1">{getFieldError('title')}</span>
              )}
            </div>
            <div className="price-item flex flex-col">
              <label htmlFor="price" className="font-semibold text-sm">
                {t("addPost.price")}
              </label>
              <input
                type="number"
                name="price"
                id="price"
                defaultValue={postData?.Price || ""}
                className={`border outline-none py-5 px-3 rounded-md w-[230px] ${getFieldError('price') ? 'border-red-500' : 'border-black'}`}
              />
              {getFieldError('price') && (
                <span className="text-red-500 text-xs mt-1">{getFieldError('price')}</span>
              )}
            </div>
            <div className="address-item flex flex-col">
              <label htmlFor="address" className="font-semibold text-sm">
                {t("addPost.address")}
              </label>
              <input
                type="text"
                name="address"
                id="address"
                defaultValue={postData?.Address || ""}
                className={`border outline-none py-5 px-3 rounded-md w-[230px] ${getFieldError('address') ? 'border-red-500' : 'border-black'}`}
              />
              {getFieldError('address') && (
                <span className="text-red-500 text-xs mt-1">{getFieldError('address')}</span>
              )}
            </div>
            <div className="des-item flex flex-col w-full outline-none">
              <label htmlFor="des" className="font-semibold text-sm">
                {t("addPost.description")}
              </label>
              <textarea
                name="des"
                id="des"
                defaultValue={postData?.Description || ""}
                className={`h-[200px] w-full border rounded-md resize-none py-5 px-3 outline-none ${getFieldError('des') ? 'border-red-500' : 'border-black'}`}
              ></textarea>
              {getFieldError('des') && (
                <span className="text-red-500 text-xs mt-1">{getFieldError('des')}</span>
              )}
            </div>
            <div className="city-item flex flex-col">
              <label htmlFor="city" className="font-semibold text-sm">
                {t("addPost.city")}
              </label>
              <input
                type="text"
                name="city"
                id="city"
                defaultValue={postData?.City || ""}
                className={`border outline-none py-5 px-3 rounded-md w-[230px] ${getFieldError('city') ? 'border-red-500' : 'border-black'}`}
              />
              {getFieldError('city') && (
                <span className="text-red-500 text-xs mt-1">{getFieldError('city')}</span>
              )}
            </div>
            <div className="bed-item flex flex-col">
              <label htmlFor="bed-num" className="font-semibold text-sm">
                {t("addPost.bedroomNumber")}
              </label>
              <input
                type="number"
                name="bed-num"
                id="bed-num"
                defaultValue={postData?.Bedrooms || ""}
                className={`border outline-none py-5 px-3 rounded-md w-[230px] ${getFieldError('bed-num') ? 'border-red-500' : 'border-black'}`}
              />
              {getFieldError('bed-num') && (
                <span className="text-red-500 text-xs mt-1">{getFieldError('bed-num')}</span>
              )}
            </div>
            <div className="bath-item flex flex-col">
              <label htmlFor="bath-num" className="font-semibold text-sm">
                {t("addPost.bathroomNumber")}
              </label>
              <input
                type="number"
                name="bath-num"
                id="bath-num"
                defaultValue={postData?.Bathrooms || ""}
                className={`border outline-none py-5 px-3 rounded-md w-[230px] ${getFieldError('bath-num') ? 'border-red-500' : 'border-black'}`}
              />
              {getFieldError('bath-num') && (
                <span className="text-red-500 text-xs mt-1">{getFieldError('bath-num')}</span>
              )}
            </div>
            <div className="lat-item flex flex-col">
              <label htmlFor="lat" className="font-semibold text-sm">
                {t("addPost.latitude")}
              </label>
              <input
                type="text"
                name="lat"
                id="lat"
                value={lat}
                onChange={(e) => {
                  setLat(e.currentTarget.value);
                }}
                className={`border outline-none py-5 px-3 rounded-md w-[230px] ${getFieldError('lat') ? 'border-red-500' : 'border-black'}`}
              />
              {getFieldError('lat') && (
                <span className="text-red-500 text-xs mt-1">{getFieldError('lat')}</span>
              )}
            </div>
            <div className="len-item flex flex-col">
              <label htmlFor="len" className="font-semibold text-sm">
                {t("addPost.longitude")}
              </label>
              <input
                type="text"
                name="len"
                id="len"
                value={len}
                onChange={(e) => {
                  setLen(e.currentTarget.value);
                }}
                className={`border outline-none py-5 px-3 rounded-md w-[230px] ${getFieldError('len') ? 'border-red-500' : 'border-black'}`}
              />
              {getFieldError('len') && (
                <span className="text-red-500 text-xs mt-1">{getFieldError('len')}</span>
              )}
            </div>
            <div className="type-item flex flex-col">
              <label htmlFor="type" className="font-semibold text-sm">
                {t("addPost.type")}
              </label>
              <select
                type="text"
                name="type"
                id="type"
                defaultValue={postData?.type || postData?.Type || "rent"}
                className={`border outline-none py-5 px-3 rounded-md w-[230px] ${getFieldError('type') ? 'border-red-500' : 'border-black'}`}
              >
                <option value="rent">{t("search.rent")}</option>
                <option value="buy">{t("search.buy")}</option>
              </select>
              {getFieldError('type') && (
                <span className="text-red-500 text-xs mt-1">{getFieldError('type')}</span>
              )}
            </div>
            <div className="property-item flex flex-col">
              <label htmlFor="prop" className="font-semibold text-sm">
                {t("addPost.property")}
              </label>
              <select
                type="text"
                name="prop"
                id="prop"
                defaultValue={postData?.porperty_id || ""}
                className={`border outline-none py-5 px-3 rounded-md w-[230px] ${getFieldError('prop') ? 'border-red-500' : 'border-black'}`}
              >
                {properties && properties.map((e) => {
                  return (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  );
                })}
              </select>
              {getFieldError('prop') && (
                <span className="text-red-500 text-xs mt-1">{getFieldError('prop')}</span>
              )}
            </div>
            <div className="utilities-item flex flex-col">
              <label htmlFor="utl-policy" className="font-semibold text-sm">
                {t("addPost.utilitiesPolicy")}
              </label>
              <select
                type="text"
                name="utl-policy"
                id="utl-policy"
                defaultValue={postData?.utilities_policy || postData?.Utilities_Policy || "owner"}
                className={`border outline-none py-5 px-3 rounded-md w-[230px] ${getFieldError('utl-policy') ? 'border-red-500' : 'border-black'}`}
              >
                <option value="owner">{t("addPost.ownerResponsible")}</option>
                <option value="tenant">{t("addPost.tenantResponsible")}</option>
                <option value="share">{t("addPost.shared")}</option>
              </select>
              {getFieldError('utl-policy') && (
                <span className="text-red-500 text-xs mt-1">{getFieldError('utl-policy')}</span>
              )}
            </div>
            <div className="pet-item flex flex-col">
              <label htmlFor="pet-policy" className="font-semibold text-sm">
                {t("addPost.petPolicy")}
              </label>
              <select
                type="text"
                name="pet-policy"
                id="pet-policy"
                defaultValue={postData?.pet_policy !== undefined ? String(postData.pet_policy) : (postData?.Pet_Policy !== undefined ? String(postData.Pet_Policy) : "false")}
                className={`border outline-none py-5 px-3 rounded-md w-[230px] ${getFieldError('pet-policy') ? 'border-red-500' : 'border-black'}`}
              >
                <option value="true">{t("addPost.allowed")}</option>
                <option value="false">{t("addPost.notAllowed")}</option>
              </select>
              {getFieldError('pet-policy') && (
                <span className="text-red-500 text-xs mt-1">{getFieldError('pet-policy')}</span>
              )}
            </div>
            <div className="income-item flex flex-col">
              <label htmlFor="income-policy" className="font-semibold text-sm">
                {t("addPost.incomePolicy")}
              </label>
              <input
                type="number"
                name="income-policy"
                id="income-policy"
                defaultValue={postData?.income_policy || postData?.Income_Policy || ""}
                className={`border outline-none py-5 px-3 rounded-md w-[230px] ${getFieldError('income-policy') ? 'border-red-500' : 'border-black'}`}
              />
              {getFieldError('income-policy') && (
                <span className="text-red-500 text-xs mt-1">{getFieldError('income-policy')}</span>
              )}
            </div>
            <div className="total-size-item flex flex-col">
              <label htmlFor="total-size" className="font-semibold text-sm">
                {t("addPost.totalSize")}
              </label>
              <input
                type="number"
                name="total-size"
                id="total-size"
                defaultValue={postData?.total_size || postData?.Total_Size || ""}
                className={`border outline-none py-5 px-3 rounded-md w-[230px] ${getFieldError('total-size') ? 'border-red-500' : 'border-black'}`}
              />
              {getFieldError('total-size') && (
                <span className="text-red-500 text-xs mt-1">{getFieldError('total-size')}</span>
              )}
            </div>
            <div className="school-item flex flex-col">
              <label htmlFor="school" className="font-semibold text-sm">
                {t("addPost.school")}
              </label>
              <input
                type="number"
                name="school"
                id="school"
                defaultValue={postData?.school || postData?.School || ""}
                className={`border outline-none py-5 px-3 rounded-md w-[230px] ${getFieldError('school') ? 'border-red-500' : 'border-black'}`}
              />
              {getFieldError('school') && (
                <span className="text-red-500 text-xs mt-1">{getFieldError('school')}</span>
              )}
            </div>
            <div className="resturant-item flex flex-col">
              <label htmlFor="resturant" className="font-semibold text-sm">
                {t("addPost.restaurant")}
              </label>
              <input
                type="number"
                name="resturant"
                id="resturant"
                defaultValue={postData?.resturant || postData?.Resturant || ""}
                className={`border outline-none py-5 px-3 rounded-md w-[230px] ${getFieldError('resturant') ? 'border-red-500' : 'border-black'}`}
              />
              {getFieldError('resturant') && (
                <span className="text-red-500 text-xs mt-1">{getFieldError('resturant')}</span>
              )}
            </div>
            <div className="bus-item flex flex-col">
              <label htmlFor="bus" className="font-semibold text-sm">
                {t("addPost.bus")}
              </label>
              <input
                type="number"
                name="bus"
                id="bus"
                defaultValue={postData?.bus || postData?.Bus || ""}
                className={`border outline-none py-5 px-3 rounded-md w-[230px] ${getFieldError('bus') ? 'border-red-500' : 'border-black'}`}
              />
              {getFieldError('bus') && (
                <span className="text-red-500 text-xs mt-1">{getFieldError('bus')}</span>
              )}
            </div>
            
            {/* Duration Pricing Section */}
            <div className="duration-prices-section w-full border-t pt-4 mt-4">
              <h3 className="font-bold text-lg mb-4">{t("addPost.durationPricing") || "Rental Duration Pricing"}</h3>
              <p className="text-sm text-gray-600 mb-4">{t("addPost.durationPricingDesc") || "Select which duration types you want to offer and set prices for each:"}</p>
              
              {['day', 'week', 'month', 'year'].map((durationType) => {
                const existing = durationPrices.find(dp => dp.duration_type === durationType);
                return (
                  <div key={durationType} className="flex items-center gap-3 mb-3">
                    <input
                      type="checkbox"
                      id={`duration-${durationType}`}
                      checked={!!existing}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setDurationPrices([...durationPrices, { duration_type: durationType, price: 0 }]);
                        } else {
                          setDurationPrices(durationPrices.filter(dp => dp.duration_type !== durationType));
                        }
                      }}
                      className="w-5 h-5"
                    />
                    <label htmlFor={`duration-${durationType}`} className="font-semibold capitalize min-w-[80px]">
                      {t(`addPost.${durationType}`) || durationType}:
                    </label>
                    {existing && (
                      <input
                        type="number"
                        placeholder={t("addPost.price") || "Price"}
                        value={existing.price}
                        onChange={(e) => {
                          setDurationPrices(durationPrices.map(dp =>
                            dp.duration_type === durationType
                              ? { ...dp, price: parseFloat(e.target.value) || 0 }
                              : dp
                          ));
                        }}
                        className="border border-black outline-none py-2 px-3 rounded-md w-[150px]"
                        min="0"
                        step="0.01"
                      />
                    )}
                  </div>
                );
              })}
              
              {durationPrices.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-800">
                    {t("addPost.durationPricingNote") || "Selected duration types will be available for renters to choose from when booking."}
                  </p>
                </div>
              )}
            </div>
            
            <button 
              type="submit"
              disabled={imagesUploading || submitting}
              className="bg-green-600 h-[86px] text-white font-semibold rounded-md w-[230px] hover:bg-green-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center justify-center gap-2">
                {(submitting && (submitKind === "create" || submitKind === "update")) ? (
                  <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></span>
                ) : null}
                {imagesUploading
                  ? "Uploading photos..."
                  : submitting
                    ? (isEditing ? (t("addPost.updating") && t("addPost.updating") !== "addPost.updating" ? t("addPost.updating") : "Updating...") : (t("addPost.creating") && t("addPost.creating") !== "addPost.creating" ? t("addPost.creating") : "Creating..."))
                    : t("addPost.create")}
              </span>
            </button>
            <button
              type="button"
              onClick={(e) => onSubmit(e, true)}
              disabled={imagesUploading || submitting}
              className="bg-yellow-300 h-[86px] text-[#444] font-semibold rounded-md w-[230px] hover:bg-yellow-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center justify-center gap-2">
                {(submitting && (submitKind === "draft_create" || submitKind === "draft_update")) ? (
                  <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[#444]"></span>
                ) : null}
                {imagesUploading
                  ? "Uploading photos..."
                  : submitting
                    ? (t("addPost.savingDraft") && t("addPost.savingDraft") !== "addPost.savingDraft" ? t("addPost.savingDraft") : "Saving draft...")
                    : t("addPost.saveAsDraft")}
              </span>
            </button>
            <button
              type="button"
              className="bg-green-600 h-[86px] text-white font-semibold rounded-md 
              w-[230px] flex justify-center items-center cursor-pointer transition hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleLocation}
              disabled={gettingLocation}
            >
              {gettingLocation ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  <span>
                    {(() => {
                      const msg = t("addPost.gettingLocation");
                      return msg && msg !== "addPost.gettingLocation" ? msg : "Getting Location...";
                    })()}
                  </span>
                </div>
              ) : (
                (() => {
                  const msg = t("addPost.currentLocation");
                  return msg && msg !== "addPost.currentLocation" ? msg : "Current Location";
                })()
              )}
            </button>
          </form>
        )}
      </div>
      <div className="right flex-1 md:bg-[#fcf5f3] overflow-y-scroll h-auto px-2 flex flex-col justify-center items-center gap-3">
        <div className="w-full">
          <UploadWidget
            value={avatarURL}
            onChange={setAvatarURL}
            onUploadingChange={setImagesUploading}
            folder="/posts"
            label={t("addPost.addPhotos") && t("addPost.addPhotos") !== "addPost.addPhotos" ? t("addPost.addPhotos") : "Add photos"}
          />
          {errors && errors.images && (
            <div className="mt-2">
              <span className="text-red-500 text-xs">{errors.images[0]}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AddPost;
