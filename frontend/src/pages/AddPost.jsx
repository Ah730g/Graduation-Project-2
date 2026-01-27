import React, { useEffect, useState } from "react";
import AxiosClient from "../AxiosClient";
import { useUserContext } from "../contexts/UserContext";
import UploadWidget from "../components/UploadWidget";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { usePopup } from "../contexts/PopupContext";
import FloorPlanGenerator from "./FloorPlanGenerator";
import FloorPlanManualBuilder from "./FloorPlanManualBuilder";
import FloorPlanEditor from "./FloorPlanEditor";
import FloorPlanSVG from "./FloorPlanSVG";

function AddPost() {
  const [properties, setProperties] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState(null);
  const { user, refreshUser } = useUserContext();
  const [lat, setLat] = useState("");
  const [len, setLen] = useState("");
  const [avatarURL, setAvatarURL] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [postId, setPostId] = useState(null);
  const [postData, setPostData] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, language } = useLanguage();
  const { showToast } = usePopup();
  const [durationPrices, setDurationPrices] = useState([]);
  const [floorPlanData, setFloorPlanData] = useState(null);
  const [showFloorPlanModal, setShowFloorPlanModal] = useState(false);
  const [floorPlanMode, setFloorPlanMode] = useState(null); // 'generate', 'manual', 'editor'
  const [floorPlanTitle, setFloorPlanTitle] = useState("");

  useEffect(() => {
    // التحقق من وجود بيانات مخطط عند العودة من صفحة المخططات
    const savedFloorPlan = localStorage.getItem('savedFloorPlanForAddPost');
    if (savedFloorPlan) {
      try {
        const floorPlan = JSON.parse(savedFloorPlan);
        setFloorPlanData(floorPlan);
        setFloorPlanTitle(floorPlan.title || "");
        showToast(t("addPost.floorPlanCreated") || "Floor plan created successfully", "success");
        localStorage.removeItem('savedFloorPlanForAddPost');
      } catch (e) {
        console.error("Error parsing saved floor plan:", e);
        localStorage.removeItem('savedFloorPlanForAddPost');
      }
    }

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
          // Load floor plan data if it exists
          if (post.floor_plan_data) {
            try {
              const floorPlan = typeof post.floor_plan_data === 'string' 
                ? JSON.parse(post.floor_plan_data) 
                : post.floor_plan_data;
              setFloorPlanData(floorPlan);
              setFloorPlanTitle(floorPlan.title || "");
            } catch (e) {
              console.error("Error parsing floor plan data:", e);
            }
          }
          // Note: New apartment detail fields will be loaded via defaultValue in form inputs
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
      floor_plan_data: floorPlanData ? (typeof floorPlanData === 'string' ? floorPlanData : JSON.stringify(floorPlanData)) : null,
      floor_number: inputs["floor-number"] ? parseInt(inputs["floor-number"]) : null,
      has_elevator: inputs["has-elevator"] === "on" || inputs["has-elevator"] === true,
      floor_condition: inputs["floor-condition"] || null,
      has_internet: inputs["has-internet"] === "on" || inputs["has-internet"] === true,
      has_electricity: inputs["has-electricity"] === "on" || inputs["has-electricity"] === true,
      has_air_conditioning: inputs["has-air-conditioning"] === "on" || inputs["has-air-conditioning"] === true,
      building_condition: inputs["building-condition"] || null,
    };
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
    
    // Check floor plan
    if (payload.floor_plan_data) {
      count++;
    }
    
    return count;
  };

  const onSubmit = (e, isDraft = false) => {
    e.preventDefault();
    
    // Get form element - could be from form submit or button click
    const form = e.target.tagName === 'FORM' ? e.target : e.currentTarget.closest('form') || e.currentTarget.form;
    
    if (!form) {
      setErrors({
        general: ['Form not found']
      });
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
      });
  };
  const handleLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude);
        setLen(position.coords.longitude);

        // console.log('Latitude:', latitude);
        // console.log('Longitude:', longitude);
      },
      (error) => {
        console.error("Error getting location:", error.message);
      }
    );
  };

  return (
    <div
      className="px-5 mx-auto max-w-[1366px] max-md:max-w-[640px] max-lg:max-w-[768px] max-xl:max-w-[1280px]
     flex flex-col h-[calc(100vh-100px)] overflow-hidden"
    >
      <div className={`inputs w-full flex flex-col gap-12 mb-3 overflow-y-scroll relative ${
        language === 'ar' ? 'lg:pl-10' : 'lg:pr-10'
      }`}>
        <h2 className="font-bold text-3xl">{t("addPost.title")}</h2>
        {errors && (
          <div className="bg-red-500 text-white p-3 rounded-md">
            {Object.keys(errors).map((e, i) => {
              return <p key={i}>{errors[e][0]}</p>;
            })}
          </div>
        )}
        {loading ? (
          <div className={`absolute top-1/2 font-bold text-3xl text-green-600 ${
            language === 'ar' 
              ? 'left-1/2 -translate-x-1/2' 
              : 'right-1/2 translate-x-1/2'
          }`}>
            {t("common.loading")}
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
                className="border border-black outline-none py-5 px-3 rounded-md w-[230px]"
              />
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
                className="border border-black outline-none py-5 px-3 rounded-md w-[230px]"
              />
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
                className="border border-black outline-none py-5 px-3 rounded-md w-[230px]"
              />
            </div>
            <div className="des-item flex flex-col w-full outline-none">
              <label htmlFor="des" className="font-semibold text-sm">
                {t("addPost.description")}
              </label>
              <textarea
                name="des"
                id="des"
                defaultValue={postData?.Description || ""}
                className="h-[200px] w-full border border-black rounded-md resize-none py-5 px-3 outline-none"
              ></textarea>
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
                className="border border-black outline-none py-5 px-3 rounded-md w-[230px]"
              />
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
                className="border border-black outline-none py-5 px-3 rounded-md w-[230px]"
              />
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
                className="border border-black outline-none py-5 px-3 rounded-md w-[230px]"
              />
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
                className="border border-black outline-none py-5 px-3 rounded-md w-[230px]"
              />
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
                className="border border-black outline-none py-5 px-3 rounded-md w-[230px]"
              />
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
                className="border border-black outline-none py-5 px-3 rounded-md w-[230px]"
              >
                <option value="rent">{t("search.rent")}</option>
                <option value="buy">{t("search.buy")}</option>
              </select>
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
                className="border border-black outline-none py-5 px-3 rounded-md w-[230px]"
              >
                {properties && properties.map((e) => {
                  return (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  );
                })}
              </select>
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
                className="border border-black outline-none py-5 px-3 rounded-md w-[230px]"
              >
                <option value="owner">{t("addPost.ownerResponsible")}</option>
                <option value="tenant">{t("addPost.tenantResponsible")}</option>
                <option value="share">{t("addPost.shared")}</option>
              </select>
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
                className="border border-black outline-none py-5 px-3 rounded-md w-[230px]"
              >
                <option value="true">{t("addPost.allowed")}</option>
                <option value="false">{t("addPost.notAllowed")}</option>
              </select>
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
                className="border border-black outline-none py-5 px-3 rounded-md w-[230px]"
              />
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
                className="border border-black outline-none py-5 px-3 rounded-md w-[230px]"
              />
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
                className="border border-black outline-none py-5 px-3 rounded-md w-[230px]"
              />
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
                className="border border-black outline-none py-5 px-3 rounded-md w-[230px]"
              />
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
                className="border border-black outline-none py-5 px-3 rounded-md w-[230px]"
              />
            </div>
            
            {/* New Apartment Details Section */}
            <div className="apartment-details-section w-full border-t pt-4 mt-4">
              <h3 className="font-bold text-lg mb-4">{t("addPost.apartmentDetails") || "Apartment Details"}</h3>
              
              <div className="flex flex-wrap gap-y-5 gap-x-2 justify-between items-center">
                <div className="floor-number-item flex flex-col">
                  <label htmlFor="floor-number" className="font-semibold text-sm">
                    {t("addPost.floorNumber") || "Floor Number"}
                  </label>
                  <input
                    type="number"
                    name="floor-number"
                    id="floor-number"
                    defaultValue={postData?.floor_number || postData?.Floor_Number || ""}
                    className="border border-black outline-none py-5 px-3 rounded-md w-[230px]"
                  />
                </div>
                
                <div className="floor-condition-item flex flex-col">
                  <label htmlFor="floor-condition" className="font-semibold text-sm">
                    {t("addPost.floorCondition") || "Floor Condition"}
                  </label>
                  <select
                    name="floor-condition"
                    id="floor-condition"
                    defaultValue={postData?.floor_condition || postData?.Floor_Condition || ""}
                    className="border border-black outline-none py-5 px-3 rounded-md w-[230px]"
                  >
                    <option value="">{t("addPost.selectOption") || "Select..."}</option>
                    <option value="excellent">{t("addPost.excellent") || "Excellent"}</option>
                    <option value="good">{t("addPost.good") || "Good"}</option>
                    <option value="fair">{t("addPost.fair") || "Fair"}</option>
                    <option value="poor">{t("addPost.poor") || "Poor"}</option>
                  </select>
                </div>
                
                <div className="building-condition-item flex flex-col">
                  <label htmlFor="building-condition" className="font-semibold text-sm">
                    {t("addPost.buildingCondition") || "Building Condition"}
                  </label>
                  <select
                    name="building-condition"
                    id="building-condition"
                    defaultValue={postData?.building_condition || postData?.Building_Condition || ""}
                    className="border border-black outline-none py-5 px-3 rounded-md w-[230px]"
                  >
                    <option value="">{t("addPost.selectOption") || "Select..."}</option>
                    <option value="excellent">{t("addPost.excellent") || "Excellent"}</option>
                    <option value="good">{t("addPost.good") || "Good"}</option>
                    <option value="fair">{t("addPost.fair") || "Fair"}</option>
                    <option value="poor">{t("addPost.poor") || "Poor"}</option>
                  </select>
                </div>
                
                <div className="amenities-checkboxes w-full flex flex-wrap gap-4 mt-2">
                  <label htmlFor="has-elevator" className="font-semibold text-sm flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="has-elevator"
                      id="has-elevator"
                      defaultChecked={postData?.has_elevator || postData?.Has_Elevator || false}
                      className="w-5 h-5"
                    />
                    {t("addPost.hasElevator") || "Has Elevator"}
                  </label>
                  
                  <label htmlFor="has-internet" className="font-semibold text-sm flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="has-internet"
                      id="has-internet"
                      defaultChecked={postData?.has_internet || postData?.Has_Internet || false}
                      className="w-5 h-5"
                    />
                    {t("addPost.hasInternet") || "Has Internet"}
                  </label>
                  
                  <label htmlFor="has-electricity" className="font-semibold text-sm flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="has-electricity"
                      id="has-electricity"
                      defaultChecked={postData?.has_electricity || postData?.Has_Electricity || false}
                      className="w-5 h-5"
                    />
                    {t("addPost.hasElectricity") || "Has Electricity"}
                  </label>
                  
                  <label htmlFor="has-air-conditioning" className="font-semibold text-sm flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="has-air-conditioning"
                      id="has-air-conditioning"
                      defaultChecked={postData?.has_air_conditioning || postData?.Has_Air_Conditioning || false}
                      className="w-5 h-5"
                    />
                    {t("addPost.hasAirConditioning") || "Has Air Conditioning"}
                  </label>
                </div>
              </div>
            </div>
            
            {/* Floor Plan Section */}
            <div className="floor-plan-section w-full border-t pt-4 mt-4">
              <h3 className="font-bold text-lg mb-4">📐 {t("addPost.floorPlan") || "Floor Plan"}</h3>
              <p className="text-sm text-gray-600 mb-4">{t("addPost.floorPlanDesc") || "Create a floor plan for your apartment to help renters visualize the space."}</p>
              
              {floorPlanData ? (
                <div className="mb-4 p-4 bg-green-50 rounded-md border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold text-green-800">✅ {t("addPost.floorPlanCreated") || "Floor plan created"}</p>
                      {floorPlanTitle && <p className="text-sm text-green-600">{floorPlanTitle}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        // حفظ بيانات المخطط الحالي للعودة
                        localStorage.setItem('floorPlanReturnUrl', '/post/add');
                        localStorage.setItem('floorPlanReturnData', JSON.stringify({
                          postId: postId,
                          isEditing: isEditing,
                          existingFloorPlan: floorPlanData
                        }));
                        // حفظ المخطط الحالي للتحرير
                        localStorage.setItem('floorPlanToEdit', JSON.stringify({
                          layout: floorPlanData.layout || floorPlanData,
                          title: floorPlanTitle,
                          originalResult: floorPlanData
                        }));
                        // الانتقال إلى صفحة التحرير
                        navigate('/floor-plan?returnTo=addPost&mode=edit');
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm"
                    >
                      {t("addPost.editFloorPlan") || "Edit"}
                    </button>
                  </div>
                  <div className="mt-3 max-h-64 overflow-auto border border-green-300 rounded p-2 bg-white">
                    <FloorPlanSVG 
                      layout={floorPlanData.layout || floorPlanData} 
                      title={floorPlanTitle}
                      interactive={false}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFloorPlanData(null);
                      setFloorPlanTitle("");
                      showToast(t("addPost.floorPlanRemoved") || "Floor plan removed", "success");
                    }}
                    className="mt-2 px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition text-sm"
                  >
                    {t("addPost.removeFloorPlan") || "Remove"}
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      // حفظ معلومات العودة في localStorage
                      localStorage.setItem('floorPlanReturnUrl', '/post/add');
                      localStorage.setItem('floorPlanReturnData', JSON.stringify({
                        postId: postId,
                        isEditing: isEditing
                      }));
                      // الانتقال إلى صفحة إنشاء المخطط
                      navigate('/floor-plan?returnTo=addPost');
                    }}
                    className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-medium"
                  >
                    🤖 {t("addPost.generateFloorPlan") || "Generate with AI"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // حفظ معلومات العودة في localStorage
                      localStorage.setItem('floorPlanReturnUrl', '/post/add');
                      localStorage.setItem('floorPlanReturnData', JSON.stringify({
                        postId: postId,
                        isEditing: isEditing
                      }));
                      // الانتقال إلى صفحة إنشاء المخطط يدوياً
                      navigate('/floor-plan/manual?returnTo=addPost');
                    }}
                    className="px-6 py-3 bg-yellow-300 text-[#444] rounded-md hover:bg-yellow-400 transition font-medium"
                  >
                    ✏️ {t("addPost.createManually") || "Create Manually"}
                  </button>
                </div>
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
              className="bg-green-600 h-[86px] text-white font-semibold rounded-md w-[230px] hover:bg-green-800 transition"
            >
              {t("addPost.create")}
            </button>
            <button
              type="button"
              onClick={(e) => onSubmit(e, true)}
              className="bg-yellow-300 h-[86px] text-[#444] font-semibold rounded-md w-[230px] hover:bg-yellow-400 transition"
            >
              {t("addPost.saveAsDraft")}
            </button>
            <div
              className="bg-green-600 h-[86px] text-white font-semibold rounded-md 
              w-[230px] flex justify-center items-center cursor-pointer transition hover:bg-green-800"
              onClick={handleLocation}
            >
              {t("addPost.currentLocation")}
            </div>
            
            {/* Images Upload Section - Moved to bottom */}
            <div className="images-upload-section w-full border-t pt-6 mt-6">
              <h3 className="font-bold text-lg mb-4">📷 {t("addPost.images") || "Images"}</h3>
              <p className="text-sm text-gray-600 mb-4">{t("addPost.imagesDesc") || "Upload images of your apartment to help renters see the property."}</p>
              <div className="bg-[#fcf5f3] rounded-lg p-6 flex justify-center items-center min-h-[300px]">
                <UploadWidget setAvatarURL={setAvatarURL} />
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Floor Plan Modal */}
      {showFloorPlanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-indigo-600 to-purple-600">
              <h2 className="text-2xl font-bold text-white">
                {floorPlanMode === 'generate' && (t("addPost.generateFloorPlan") || "Generate Floor Plan with AI")}
                {floorPlanMode === 'manual' && (t("addPost.createManually") || "Create Floor Plan Manually")}
                {floorPlanMode === 'editor' && (t("addPost.editFloorPlan") || "Edit Floor Plan")}
              </h2>
              <button
                onClick={() => {
                  setShowFloorPlanModal(false);
                  setFloorPlanMode(null);
                }}
                className="text-white hover:bg-white/20 rounded-full p-2 transition"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {floorPlanMode === 'generate' && (
                <FloorPlanGenerator 
                  onFloorPlanCreated={(result) => {
                    setFloorPlanData(result);
                    setFloorPlanTitle(result.title || "");
                    setShowFloorPlanModal(false);
                    setFloorPlanMode(null);
                    showToast(t("addPost.floorPlanCreated") || "Floor plan created successfully", "success");
                  }}
                />
              )}
              {floorPlanMode === 'manual' && (
                <FloorPlanManualBuilder 
                  onFloorPlanCreated={(result) => {
                    setFloorPlanData(result);
                    setFloorPlanTitle(result.title || "");
                    setShowFloorPlanModal(false);
                    setFloorPlanMode(null);
                    showToast(t("addPost.floorPlanCreated") || "Floor plan created successfully", "success");
                  }}
                />
              )}
              {floorPlanMode === 'editor' && floorPlanData && (
                <FloorPlanEditor
                  initialLayout={floorPlanData.layout || floorPlanData}
                  title={floorPlanTitle}
                  originalResult={floorPlanData}
                  onLayoutUpdate={(updatedLayout) => {
                    setFloorPlanData({
                      ...floorPlanData,
                      layout: updatedLayout
                    });
                  }}
                  onClose={() => {
                    setShowFloorPlanModal(false);
                    setFloorPlanMode(null);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddPost;
