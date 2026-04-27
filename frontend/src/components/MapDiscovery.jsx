import React, { useEffect, useRef } from 'react';
import { Map as MapIcon, Navigation, Info } from 'lucide-react';
import { API_BASE_URL } from '../config';
import './MapDiscovery.css';

// Coordinates for major Indian IT cities (Center points)
const CITY_COORDS = {
  'Bangalore': [12.9716, 77.5946],
  'Hyderabad': [17.3850, 78.4867],
  'Pune': [18.5204, 73.8567],
  'Mumbai': [19.0760, 72.8777],
  'Delhi NCR': [28.6139, 77.2090],
  'Gurgaon': [28.4595, 77.0266],
  'Noida': [28.5355, 77.3910],
  'Chennai': [13.0827, 80.2707],
  'Kolkata': [22.5726, 88.3639],
  'Ahmedabad': [23.0225, 72.5714],
  'Kochi': [9.9312, 76.2673],
  'Jaipur': [26.9124, 75.7873],
  'Chandigarh': [30.7333, 76.7794],
  'Indore': [22.7196, 75.8577],
  'Bhubaneswar': [20.2961, 85.8245],
  'Coimbatore': [11.0168, 76.9558],
  'Mysore': [12.2958, 76.6394],
  'Lucknow': [26.8467, 80.9462],
};

const MapDiscovery = ({ pgs, selectedCity }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    // 1. Initialize Map if not already done
    if (!mapInstance.current && window.L) {
      const initialCenter = selectedCity && CITY_COORDS[selectedCity] ? CITY_COORDS[selectedCity] : [20.5937, 78.9629];
      const initialZoom = selectedCity ? 12 : 5;
      
      mapInstance.current = window.L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false // Cleaner UI
      }).setView(initialCenter, initialZoom);
      
      // Upgrade to Premium Tiles (CartoDB Voyager)
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(mapInstance.current);

      window.L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // 2. Center map when city changes
  useEffect(() => {
    if (mapInstance.current && selectedCity && CITY_COORDS[selectedCity]) {
      mapInstance.current.flyTo(CITY_COORDS[selectedCity], 12, { duration: 1.5 });
    }
  }, [selectedCity]);

  // 3. Render Markers
  useEffect(() => {
    if (!mapInstance.current || !window.L) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    pgs.forEach(pg => {
      let lat = pg.latitude;
      let lng = pg.longitude;

      if (!lat || !lng) {
        const cityBase = CITY_COORDS[pg.city] || [20.5937, 78.9629];
        lat = cityBase[0] + (Math.random() - 0.5) * 0.05;
        lng = cityBase[1] + (Math.random() - 0.5) * 0.05;
      }

      // ─── Custom Marker Concept ───
      const marker = window.L.marker([lat, lng], {
        icon: window.L.divIcon({
          className: 'custom-div-dot',
          html: '<div class="pulse-marker"></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        })
      }).addTo(mapInstance.current);
      
      const thumbUrl = pg.photos && pg.photos.length > 0 
        ? `${API_BASE_URL}${pg.photos[0]}` 
        : 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=400&q=80';

      const popupHtml = `
        <div class="map-popup glass">
          <div class="popup-image" style="background-image: url('${thumbUrl}')"></div>
          <div class="popup-body">
            <div class="popup-badge">PG</div>
            <h4>${pg.name}</h4>
            <p class="popup-price">₹${pg.rentMonthly.toLocaleString()}<small>/mo</small></p>
            <p class="popup-address"><i class="map-pin-icon"></i> ${pg.address.slice(0, 30)}${pg.address.length > 30 ? '...' : ''}</p>
            <div class="popup-actions">
               <a href="/pg/${pg.id}" class="popup-link">Explore Space</a>
               <button class="popup-nav-btn" onclick="window.open('https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pg.address + ',' + pg.city)}', '_blank')">
                 <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
               </button>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        className: 'custom-leaflet-popup',
        minWidth: 220
      });

      markersRef.current.push(marker);
    });

    // If no city selected, fit bounds to show all markers
    if (!selectedCity && markersRef.current.length > 0) {
      const group = new window.L.featureGroup(markersRef.current);
      mapInstance.current.fitBounds(group.getBounds().pad(0.1));
    }

  }, [pgs, selectedCity]);

  return (
    <div className="map-discovery-wrapper fade-in">
      <div id="map-container" ref={mapRef} className="map-container"></div>
      
      {/* Floating Controls Overlay */}
      <div className="map-overlay-controls">
        <div className="location-chip glass">
          <Navigation size={14} />
          <span>{selectedCity || "Showing All India"}</span>
        </div>
        
        <button 
          className="map-action-chip glass pointer" 
          onClick={() => {
            if (mapInstance.current && markersRef.current.length > 0) {
              const group = new window.L.featureGroup(markersRef.current);
              mapInstance.current.fitBounds(group.getBounds().pad(0.2));
            }
          }}
        >
          <MapIcon size={14} />
          <span>Fit all PGs</span>
        </button>

        <div className="info-chip glass">
          <Info size={14} />
          <span>Click a pin to view PG details</span>
        </div>
      </div>
    </div>
  );
};

export default MapDiscovery;
