import React, { useMemo, useState } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { createFloorMaterial, createInternalWallMaterial, createExternalWallMaterial } from '../../lib/floorplan3d/materials';
import Wall3D from './Wall3D';
import Furniture3D from './Furniture3D';
import Window3D from './Window3D';

export default function Room3DComponent({ room, onRoomClick, onRoomEdit, onRoomDelete }) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Defensive check: ensure room has required geometry
  if (!room || !room.geometry || !room.geometry.floor || !room.geometry.floor.position) {
    console.error('Room3D: Missing required geometry data', room);
    return null;
  }

  const floorMaterial = useMemo(() => createFloorMaterial(room.type), [room.type]);
  const internalWallMaterial = useMemo(() => createInternalWallMaterial(), []);
  const externalWallMaterial = useMemo(() => createExternalWallMaterial(), []);

  // حساب موضع اسم الغرفة - أعلى من السقف قليلاً ليكون مرئياً دائماً
  const ceilingHeight = room.ceilingHeight || 2.7; // ارتفاع السقف
  const wallHeight = room.wallHeight || 2.5; // ارتفاع الجدار
  const textHeight = wallHeight + 0.3; // أعلى من الجدار بـ 30 سم
  
  // موضع اسم الغرفة في وسط الغرفة - أعلى من الجدران
  const roomNamePosition = [
    room.geometry.floor.position[0], // في المنتصف تماماً
    textHeight,
    room.geometry.floor.position[2],
  ];

  // موضع المقاسات أسفل اسم الغرفة مع مسافة فاصلة - نفس X و Z لكن Y أقل
  const dimensionsPosition = [
    room.geometry.floor.position[0], // نفس X (في المنتصف)
    textHeight - 0.7, // أسفل اسم الغرفة بـ 70 سم (مسافة فاصلة أكبر قليلاً)
    room.geometry.floor.position[2], // نفس Z
  ];

  // موضع لوحة الإدارة (Management Panel) - أعلى من اسم الغرفة
  const managementPosition = [
    room.geometry.floor.position[0],
    textHeight + 0.4,
    room.geometry.floor.position[2],
  ];

  // نص المقاسات
  const dimensionsText = `${room.width_m || 0} × ${room.height_m || 0} م`;

  // حساب حجم الخط بناءً على حجم الغرفة - تصغير الحجم لضمان الوضوح
  const roomNameFontSize = Math.max(10, Math.min((room.width_m || 1) * 0.12 * 14, 14));
  const dimensionsFontSize = Math.max(9, Math.min((room.width_m || 1) * 0.1 * 12, 12));

  // اسم الغرفة - يظهر دائماً أو اسم افتراضي
  const roomName = room.name || room.type || `غرفة ${room.id || ''}`;
  
  // Debug: Log room data to console
  React.useEffect(() => {
    if (room) {
      console.log('Room3D - Room data:', {
        id: room.id,
        name: room.name,
        type: room.type,
        width_m: room.width_m,
        height_m: room.height_m,
        position: room.geometry?.floor?.position,
        roomName: roomName,
      });
    }
  }, [room, roomName]);

  return (
    <group
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      onClick={() => onRoomClick && onRoomClick(room)}
    >
      {/* لوحة الإدارة - تظهر عند التمرير أو النقر */}
      {(isHovered || onRoomClick) && (
        <Html
          position={managementPosition}
          center
          style={{
            pointerEvents: 'auto',
          }}
          occlude={false}
        >
          <div
            style={{
              background: 'rgba(59, 130, 246, 0.95)',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '2px solid #3b82f6',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              fontFamily: 'Tahoma, Arial, sans-serif',
            }}
          >
            {onRoomEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRoomEdit(room);
                }}
                style={{
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
                onMouseEnter={(e) => e.target.style.background = '#059669'}
                onMouseLeave={(e) => e.target.style.background = '#10b981'}
              >
                ✏️ تعديل
              </button>
            )}
            {onRoomDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`هل أنت متأكد من حذف ${roomName}؟`)) {
                    onRoomDelete(room);
                  }
                }}
                style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
                onMouseEnter={(e) => e.target.style.background = '#dc2626'}
                onMouseLeave={(e) => e.target.style.background = '#ef4444'}
              >
                🗑️ حذف
              </button>
            )}
            {onRoomClick && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRoomClick(room);
                }}
                style={{
                  background: '#6366f1',
                  color: 'white',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
                onMouseEnter={(e) => e.target.style.background = '#4f46e5'}
                onMouseLeave={(e) => e.target.style.background = '#6366f1'}
              >
                👁️ تفاصيل
              </button>
            )}
          </div>
        </Html>
      )}

      {/* اسم الغرفة - في أعلى الغرفة - دائماً مرئي */}
      <Html
        position={roomNamePosition}
        center
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
        }}
        occlude={false}
        zIndexRange={[100, 0]}
      >
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.25)',
            padding: '4px 10px',
            borderRadius: '6px',
            border: '1.5px solid rgba(26, 26, 26, 0.2)',
            fontSize: `${roomNameFontSize}px`,
            fontWeight: 'bold',
            color: '#1a1a1a',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            fontFamily: 'Tahoma, Arial, sans-serif',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
            display: 'inline-block',
            backdropFilter: 'blur(4px)',
          }}
        >
          {roomName}
        </div>
      </Html>

      {/* المقاسات - أسفل اسم الغرفة - دائماً مرئي */}
      <Html
        position={dimensionsPosition}
        center
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
        }}
        occlude={false}
        zIndexRange={[99, 0]}
      >
        <div
          style={{
            background: 'rgba(240, 240, 240, 0.25)',
            padding: '4px 10px',
            borderRadius: '6px',
            border: '1.5px solid rgba(102, 102, 102, 0.2)',
            fontSize: `${dimensionsFontSize}px`,
            fontWeight: '600',
            color: '#333',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            fontFamily: 'Tahoma, Arial, sans-serif',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
            display: 'inline-block',
            backdropFilter: 'blur(4px)',
          }}
        >
          {dimensionsText}
        </div>
      </Html>

      {/* الأرضية */}
      <mesh
        position={room.geometry.floor.position}
      >
        <boxGeometry args={room.geometry.floor.size} />
        <primitive object={floorMaterial} attach="material" />
      </mesh>

      {/* الجدران */}
      {(room.geometry.walls || []).map((wall, index) => (
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
      {(room.furniture3D || []).map((furniture, index) => (
        <Furniture3D
          key={`furniture-${room.id}-${index}`}
          type={furniture.type}
          position={furniture.position}
          size={furniture.size}
          rotation={furniture.rotation}
        />
      ))}

      {/* النوافذ */}
      {(room.windows3D || []).map((window, index) => (
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

