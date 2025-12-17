import React from 'react';

interface EffectNotification {
  message: string;
  type: string;
}

interface EffectNotificationsProps {
  effectNotification: EffectNotification | null;
  isTeleportationMode: boolean;
}

const EffectNotifications: React.FC<EffectNotificationsProps> = ({
  effectNotification,
  isTeleportationMode,
}) => {
  return (
    <>
      {effectNotification && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 notification-slide px-6 py-3 rounded-lg font-semibold text-center shadow-2xl ${
          effectNotification.type === 'flip' ? 'bg-purple-600' :
          effectNotification.type === 'direction' ? 'bg-blue-600' :
          effectNotification.type === 'teleportation' ? 'bg-indigo-600' :
          effectNotification.type === 'measurement' ? 'bg-yellow-600' :
          effectNotification.type === 'superposition' ? 'bg-pink-600' :
          effectNotification.type === 'victory' ? 'bg-green-600 text-2xl font-extrabold animate-pulse' :
          effectNotification.type === 'gameEnd' ? 'bg-red-600 text-xl font-bold' :
          'bg-gray-600'
        }`}>
          {effectNotification.message}
        </div>
      )}
      {isTeleportationMode && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg font-semibold text-center bg-indigo-600 animate-pulse border-2 border-yellow-400 shadow-2xl">
          🎯 Click on an opponent's card to teleport it to your hand!
        </div>
      )}
    </>
  );
};

export default EffectNotifications;

