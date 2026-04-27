import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../config';

const SOCKET_URL = API_BASE_URL;

export default function SmartBedMap({ pgId, initialFloors, onBookBed }) {
  const [floors, setFloors] = useState(initialFloors || []);

  useEffect(() => {
    // Connect to Socket.io server
    const socket = io(SOCKET_URL);

    // Join the PG specific room
    socket.emit('join_pg_room', pgId);

    // Listen for real-time bed updates
    socket.on('bed_status_changed', (data) => {
      const { bedId, newStatus } = data;
      
      setFloors((prevFloors) => {
        return prevFloors.map((floor) => ({
          ...floor,
          beds: floor.beds.map((bed) =>
            bed.id === bedId ? { ...bed, status: newStatus } : bed
          )
        }));
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [pgId]);

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white">
      <h2 className="text-3xl mb-6 font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
        Live Occupancy Viewer
      </h2>
      
      {floors.map((floor) => (
        <div key={floor.id} className="mb-8 border border-gray-700 bg-gray-800 rounded-xl p-5 shadow-lg">
          <h3 className="text-xl mb-4 font-semibold text-gray-300">
            Floor {floor.floorNumber}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {floor.beds.map((bed) => {
              const isOccupied = bed.status === "OCCUPIED";
              return (
                <div 
                  key={bed.id}
                  onClick={() => !isOccupied && onBookBed(bed.id)}
                  className={`relative p-5 rounded-lg text-center font-medium transition-all duration-300 border-2
                    ${isOccupied 
                      ? 'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed shadow-none' 
                      : 'bg-green-500/10 border-green-500 text-green-400 cursor-pointer hover:bg-green-500/20 hover:shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:-translate-y-1'
                    }`}
                >
                  <div className="text-lg">{bed.identifier}</div>
                  <div className="text-sm mt-2 opacity-80">
                    {isOccupied ? "Occupied" : "Available"}
                  </div>
                  {/* Subtle pulsing dot for available beds */}
                  {!isOccupied && (
                     <div className="absolute top-2 right-2 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
