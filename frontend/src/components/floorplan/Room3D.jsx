import React, { useMemo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { createFloorMaterial, createInternalWallMaterial, createExternalWallMaterial } from '../../lib/floorplan3d/materials';
import Wall3D from './Wall3D';
import Furniture3D from './Furniture3D';
import Window3D from './Window3D';

export default function Room3DComponent({ room }) {
  const floorMaterial = useMemo(() => createFloorMaterial(room.type), [room.type]);
  const internalWallMaterial = useMemo(() => createInternalWallMaterial(), []);
  const externalWallMaterial = useMemo(() => createExternalWallMaterial(), []);

  // حساب موضع اسم الغرفة - بمستوى السقف (أعلى من الأثاث)
  // نضع اسم الغرفة في النصف العلوي من الغرفة
  const ceilingHeight = room.ceilingHeight || 2.7; // ارتفاع السقف
  const textHeight = ceilingHeight - 0.1; // 10 سم تحت السقف
  
  const roomNamePosition = [
    room.geometry.floor.position[0],
    textHeight, // ارتفاع قريب من السقف (أعلى من الأثاث)
    room.geometry.floor.position[2] + (room.height_m * 0.2), // إزاحة أكبر للأمام (النصف العلوي)
  ];

  // حساب موضع المقاسات أسفل اسم الغرفة - بمستوى السقف
  // نضع المقاسات في النصف السفلي من الغرفة لتجنب التداخل
  const dimensionsPosition = [
    room.geometry.floor.position[0],
    textHeight - 0.15, // ارتفاع أقل قليلاً من اسم الغرفة لكن لا يزال قريب من السقف
    room.geometry.floor.position[2] - (room.height_m * 0.2), // إزاحة أكبر للخلف (النصف السفلي)
  ];

  // مادة شفافة للنص
  const textMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#1a1a1a',
      transparent: true,
      opacity: 0.9,
      depthWrite: false, // لا يكتب في depth buffer حتى لا يحجب العناصر
    });
  }, []);

  // مادة شفافة للمقاسات (أفتح قليلاً)
  const dimensionsMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#4a4a4a',
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
  }, []);

  // نص المقاسات
  const dimensionsText = `${room.width_m} × ${room.height_m} م`;

  return (
    <group>
      {/* اسم الغرفة - في النصف العلوي من الغرفة، موازي للسقف */}
      <Text
        position={roomNamePosition}
        fontSize={Math.min(room.width_m * 0.13, 1.0)} // حجم أصغر قليلاً لتقليل التداخل
        color="#1a1a1a"
        anchorX="center"
        anchorY="middle"
        maxWidth={room.width_m * 0.8} // عرض أقل لتقليل التداخل
        textAlign="center"
        outlineWidth={0.05}
        outlineColor="#ffffff"
        outlineOpacity={0.9}
        depthOffset={-5} // يجعل النص يظهر فوق العناصر الأخرى
        renderOrder={1000} // يضمن أن النص يظهر فوق كل شيء
        rotation={[-Math.PI / 2, 0, 0]} // دوران 90 درجة ليكون موازياً للأرضية (السقف)
      >
        {room.name}
      </Text>

      {/* المقاسات - في النصف السفلي من الغرفة، موازية للسقف */}
      <Text
        position={dimensionsPosition}
        fontSize={Math.min(room.width_m * 0.1, 0.75)} // حجم أصغر لتقليل التداخل
        color="#4a4a4a"
        anchorX="center"
        anchorY="middle"
        maxWidth={room.width_m * 0.75} // عرض أقل
        textAlign="center"
        outlineWidth={0.03}
        outlineColor="#ffffff"
        outlineOpacity={0.75}
        depthOffset={-4} // عمق أقل قليلاً من اسم الغرفة
        renderOrder={999} // يظهر بعد اسم الغرفة
        rotation={[-Math.PI / 2, 0, 0]} // دوران 90 درجة ليكون موازياً للأرضية (السقف)
      >
        {dimensionsText}
      </Text>

      {/* الأرضية */}
      <mesh
        position={room.geometry.floor.position}
      >
        <boxGeometry args={room.geometry.floor.size} />
        <primitive object={floorMaterial} attach="material" />
      </mesh>

      {/* الجدران */}
      {room.geometry.walls.map((wall, index) => (
        <Wall3D
          key={`wall-${room.id}-${index}`}
          position={wall.position}
          size={wall.size}
          rotation={wall.rotation}
          material={wall.isExternal ? externalWallMaterial : internalWallMaterial}
        />
      ))}

      {/* السقف - تم إزالته للسماح برؤية داخل الشقة */}

      {/* الأثاث */}
      {room.furniture3D.map((furniture, index) => (
        <Furniture3D
          key={`furniture-${room.id}-${index}`}
          type={furniture.type}
          position={furniture.position}
          size={furniture.size}
          rotation={furniture.rotation}
        />
      ))}

      {/* النوافذ */}
      {room.windows3D.map((window, index) => (
        <Window3D
          key={`window-${room.id}-${index}`}
          position={window.position}
          size={window.size}
          rotation={window.rotation}
        />
      ))}
    </group>
  );
}

