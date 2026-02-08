import React, { useMemo, Suspense, Component } from 'react';
import * as THREE from 'three';
import { createFurnitureMaterial } from '../../lib/floorplan3d/materials';
import { useFurnitureModel, FURNITURE_MODELS } from '../../lib/floorplan3d/modelLoader';
import { PrimitiveFurniture } from '../../lib/floorplan3d/primitiveFurniture';

// مكون داخلي لتحميل النموذج داخل Suspense
function FurnitureModelLoader({ type, position, size, rotation }) {
  const model3D = useFurnitureModel(type);
  const safeRotation = rotation ?? [0, 0, 0];

  // حساب المقياس وإزاحة النموذج: أسفل على الأرض + مركز أفقي (XZ) عند أصل الـ group
  const { scale, offset } = useMemo(() => {
    if (!model3D) {
      return { scale: [1, 1, 1], offset: [0, 0, 0] };
    }
    try {
      const box = new THREE.Box3().setFromObject(model3D);
      const modelSize = box.getSize(new THREE.Vector3());
      if (modelSize.x === 0 || modelSize.y === 0 || modelSize.z === 0) {
        return { scale: [1, 1, 1], offset: [0, 0, 0] };
      }
      const scaleX = size[0] / modelSize.x;
      const scaleY = size[1] / modelSize.y;
      const scaleZ = size[2] / modelSize.z;
      const minScale = Math.min(scaleX, scaleY, scaleZ);
      const scaleVec = [minScale, minScale, minScale];
      const centerX = (box.min.x + box.max.x) / 2;
      const centerZ = (box.min.z + box.max.z) / 2;
      const offsetX = -centerX * minScale;
      const offsetZ = -centerZ * minScale;
      const offsetY = -box.min.y * minScale;
      return { scale: scaleVec, offset: [offsetX, offsetY, offsetZ] };
    } catch (error) {
      console.error(`[Furniture3D] Error calculating scale for ${type}:`, error);
      return { scale: [1, 1, 1], offset: [0, 0, 0] };
    }
  }, [model3D, size, type]);

  if (model3D) {
    return (
      <group position={position} rotation={safeRotation} scale={scale}>
        <group position={offset}>
          <primitive object={model3D} />
        </group>
      </group>
    );
  }

  return (
    <group position={position} rotation={safeRotation}>
      <PrimitiveFurniture type={type} size={size} position={[0, 0, 0]} rotation={[0, 0, 0]} />
    </group>
  );
}

// Error Boundary component للتعامل مع أخطاء تحميل النماذج
class FurnitureErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.warn(`[Furniture3D] Error loading model for ${this.props.type}, using primitive:`, error);
  }

  render() {
    const rotation = this.props.rotation ?? [0, 0, 0];
    if (this.state.hasError) {
      return (
        <group position={this.props.position} rotation={rotation}>
          <PrimitiveFurniture
            type={this.props.type}
            size={this.props.size}
            position={[0, 0, 0]}
            rotation={[0, 0, 0]}
          />
        </group>
      );
    }
    return this.props.children;
  }
}

const DEFAULT_ROTATION = [0, 0, 0];

export default function Furniture3D({ type, position, size, rotation }) {
  const safeRotation = rotation ?? DEFAULT_ROTATION;
  const hasModel = FURNITURE_MODELS[type];

  if (hasModel) {
    return (
      <FurnitureErrorBoundary type={type} position={position} rotation={safeRotation} size={size}>
        <Suspense fallback={
          <group position={position} rotation={safeRotation}>
            <PrimitiveFurniture type={type} size={size} position={[0, 0, 0]} rotation={[0, 0, 0]} />
          </group>
        }>
          <FurnitureModelLoader type={type} position={position} size={size} rotation={safeRotation} />
        </Suspense>
      </FurnitureErrorBoundary>
    );
  }

  return (
    <group position={position} rotation={safeRotation}>
      <PrimitiveFurniture type={type} size={size} position={[0, 0, 0]} rotation={[0, 0, 0]} />
    </group>
  );
}

