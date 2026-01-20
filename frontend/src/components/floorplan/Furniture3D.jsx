import React, { useMemo, Suspense } from 'react';
import * as THREE from 'three';
import { createFurnitureMaterial } from '../../lib/floorplan3d/materials';
import { useFurnitureModel, FURNITURE_MODELS } from '../../lib/floorplan3d/modelLoader';
import { PrimitiveFurniture } from '../../lib/floorplan3d/primitiveFurniture';

// مكون داخلي لتحميل النموذج داخل Suspense
function FurnitureModelLoader({ type, position, size, rotation }) {
  // محاولة تحميل نموذج 3D جاهز
  const model3D = useFurnitureModel(type);
  
  // حساب المقياس بناءً على الحجم المطلوب
  const scale = useMemo(() => {
    if (!model3D) {
      console.log(`[Furniture3D] No 3D model for ${type}, using enhanced primitive`);
      return [1, 1, 1];
    }
    
    try {
      // حساب حجم النموذج الأصلي
      const box = new THREE.Box3().setFromObject(model3D);
      const modelSize = box.getSize(new THREE.Vector3());
      
      // تجنب القسمة على صفر
      if (modelSize.x === 0 || modelSize.y === 0 || modelSize.z === 0) {
        console.warn(`[Furniture3D] Invalid model size for ${type}, using enhanced primitive`);
        return [1, 1, 1];
      }
      
      // حساب المقياس المطلوب
      const scaleX = size[0] / modelSize.x;
      const scaleY = size[1] / modelSize.y;
      const scaleZ = size[2] / modelSize.z;
      
      // استخدام أصغر مقياس للحفاظ على النسب
      const minScale = Math.min(scaleX, scaleY, scaleZ);
      
      console.log(`[Furniture3D] Scaling ${type}: modelSize=${modelSize.x.toFixed(2)},${modelSize.y.toFixed(2)},${modelSize.z.toFixed(2)}, targetSize=${size[0]},${size[1]},${size[2]}, scale=${minScale.toFixed(2)}`);
      
      return [minScale, minScale, minScale];
    } catch (error) {
      console.error(`[Furniture3D] Error calculating scale for ${type}:`, error);
      return [1, 1, 1];
    }
  }, [model3D, size, type]);

  // إذا كان هناك نموذج 3D جاهز، استخدمه
  if (model3D) {
    return (
      <group position={position} rotation={rotation} scale={scale}>
        <primitive object={model3D} />
      </group>
    );
  }

  // خلاف ذلك، استخدم الشكل البدائي المحسّن
  return (
    <group position={position} rotation={rotation}>
      <PrimitiveFurniture type={type} size={size} position={[0, 0, 0]} rotation={[0, 0, 0]} />
    </group>
  );
}

export default function Furniture3D({ type, position, size, rotation }) {
  // التحقق من وجود نموذج مسجل
  const hasModel = FURNITURE_MODELS[type];
  
  // إذا كان هناك نموذج مسجل، استخدم Suspense لتحميله
  if (hasModel) {
    return (
      <Suspense fallback={
        // Fallback أثناء التحميل - استخدام الشكل البدائي المحسّن
        <group position={position} rotation={rotation}>
          <PrimitiveFurniture type={type} size={size} position={[0, 0, 0]} rotation={[0, 0, 0]} />
        </group>
      }>
        <FurnitureModelLoader type={type} position={position} size={size} rotation={rotation} />
      </Suspense>
    );
  }

  // إذا لم يكن هناك نموذج، استخدم الشكل البدائي المحسّن مباشرة
  return (
    <group position={position} rotation={rotation}>
      <PrimitiveFurniture type={type} size={size} position={[0, 0, 0]} rotation={[0, 0, 0]} />
    </group>
  );
}

