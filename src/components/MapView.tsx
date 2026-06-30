import React, { useEffect, useRef, useState } from 'react';
import { Issue } from '../types';
import { translations } from '../mockData';
import { MapPin, AlertCircle, RefreshCw, Layers } from 'lucide-react';

interface MapViewProps {
  lang: 'en' | 'es' | 'hi' | 'ja' | 'mr';
  issues: Issue[];
  center: [number, number];
  onViewDetails: (issueId: string) => void;
}

export default function MapView({ lang, issues, center, onViewDetails }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Helper to get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'urgent': return '#dc2626'; // Red
      case 'high': return '#f97316';   // Orange
      case 'medium': return '#d97706'; // Yellow-Orange
      case 'low': return '#16a34a';    // Green
      default: return '#2563eb';       // Blue
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'urgent': return 'URGENT';
      case 'high': return 'HIGH';
      case 'medium': return 'MEDIUM';
      case 'low': return 'LOW';
      default: return 'NORMAL';
    }
  };

  useEffect(() => {
    // Return early if Leaflet is not available in the global window
    const L = (window as any).L;
    if (!L || !mapContainerRef.current) return;

    // Initialize map if it doesn't exist
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        scrollWheelZoom: true
      }).setView(center, 14);

      // Add zoom control to bottom right
      L.control.zoom({
        position: 'bottomright'
      }).addTo(mapRef.current);

      // Base tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapRef.current);

      // Layer group for markers
      markersGroupRef.current = L.layerGroup().addTo(mapRef.current);

      // Listen for popup opens to attach React click handlers dynamically
      mapRef.current.on('popupopen', (e: any) => {
        const popupNode = e.popup._contentNode;
        if (popupNode) {
          const viewBtn = popupNode.querySelector('.map-view-details-btn');
          if (viewBtn) {
            viewBtn.addEventListener('click', (ev: Event) => {
              ev.preventDefault();
              const issueId = viewBtn.getAttribute('data-id');
              if (issueId) onViewDetails(issueId);
            });
          }
        }
      });

      setIsMapLoaded(true);
    } else {
      // Recenter if center changes
      mapRef.current.setView(center, 14);
    }

    // Clean up on component unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setIsMapLoaded(false);
      }
    };
  }, [center]);

  // Update markers when issues list or filtering changes
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current || !markersGroupRef.current) return;

    // Clear old markers
    markersGroupRef.current.clearLayers();

    // Filter issues based on active filter state
    const filteredIssues = issues.filter(issue => {
      if (issue.isDuplicateOf) return false; // Hide merged issues from map
      if (selectedSeverity === 'all') return true;
      return issue.severity === selectedSeverity;
    });

    // Populate new markers
    filteredIssues.forEach((issue) => {
      const color = getSeverityColor(issue.severity);
      const pulseHtml = issue.severity === 'urgent' ? 'animate-pulse' : '';

      // Circular high-contrast pin styled using Leaflet DivIcon
      const pinIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div class="relative flex items-center justify-center w-8 h-8">
            <div class="absolute w-6 h-6 rounded-full opacity-30 ${pulseHtml}" style="background-color: ${color}"></div>
            <div class="w-4.5 h-4.5 rounded-full border-2 border-white shadow-md" style="background-color: ${color}"></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const popupContent = `
        <div class="p-2 select-none" style="min-width: 200px">
          <div class="flex items-center justify-between gap-2 mb-1">
            <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white" 
              style="background-color: ${color}">
              ${getSeverityLabel(issue.severity)}
            </span>
            <span class="text-[10px] font-semibold text-gray-500 capitalize">
              ${issue.status.replace('_', ' ')}
            </span>
          </div>
          <h4 class="font-bold text-sm text-gray-900">${issue.title}</h4>
          <p class="text-xs text-gray-400 mt-1 line-clamp-2">${issue.description}</p>
          <button class="map-view-details-btn mt-3 w-full py-1.5 text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-sm cursor-pointer border-0" 
            data-id="${issue.id}">
            View Progress Timeline
          </button>
        </div>
      `;

      L.marker([issue.latitude, issue.longitude], { icon: pinIcon })
        .addTo(markersGroupRef.current)
        .bindPopup(popupContent, { closeButton: false, offset: [0, -4] });
    });
  }, [issues, selectedSeverity, isMapLoaded]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-brand-text-main flex items-center gap-3">
            <MapPin className="w-8 h-8 text-brand-primary" />
            <span>Interactive Neighborhood Map</span>
          </h1>
          <p className="mt-2 text-brand-text-sub">
            Real-time citizen map of verified local hazards and issues.
          </p>
        </div>

        {/* Legend Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 bg-brand-card p-1.5 rounded-2xl border border-brand-border shadow-brand-sm">
          <button
            onClick={() => setSelectedSeverity('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl cursor-pointer transition-all ${
              selectedSeverity === 'all' 
                ? 'bg-brand-bg text-brand-text-main border border-brand-border shadow-brand-sm' 
                : 'text-brand-text-sub'
            }`}
          >
            All Issues
          </button>
          <button
            onClick={() => setSelectedSeverity('urgent')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl cursor-pointer flex items-center gap-1.5 transition-all ${
              selectedSeverity === 'urgent' 
                ? 'bg-brand-danger/10 text-brand-danger border border-brand-danger/20 shadow-brand-sm' 
                : 'text-brand-text-sub'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-brand-danger"></span>
            Urgent
          </button>
          <button
            onClick={() => setSelectedSeverity('high')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl cursor-pointer flex items-center gap-1.5 transition-all ${
              selectedSeverity === 'high' 
                ? 'bg-brand-warning/10 text-brand-warning border border-brand-warning/20 shadow-brand-sm' 
                : 'text-brand-text-sub'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-brand-warning"></span>
            High
          </button>
          <button
            onClick={() => setSelectedSeverity('medium')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl cursor-pointer flex items-center gap-1.5 transition-all ${
              selectedSeverity === 'medium' 
                ? 'bg-brand-warning/10 text-brand-warning border border-brand-warning/20 shadow-brand-sm' 
                : 'text-brand-text-sub'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-brand-warning/80"></span>
            Medium
          </button>
          <button
            onClick={() => setSelectedSeverity('low')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl cursor-pointer flex items-center gap-1.5 transition-all ${
              selectedSeverity === 'low' 
                ? 'bg-brand-success/10 text-brand-success border border-brand-success/20 shadow-brand-sm' 
                : 'text-brand-text-sub'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-brand-success"></span>
            Low
          </button>
        </div>
      </div>

      {/* Map Container Card */}
      <div className="relative bg-brand-card border border-brand-border p-2 rounded-3xl shadow-brand-lg">
        <div 
          ref={mapContainerRef} 
          className="w-full h-[500px] rounded-2xl overflow-hidden shadow-inner border border-brand-border"
          style={{ zIndex: 1 }}
        ></div>

        {/* Emergency Alert indicator */}
        <div className="absolute bottom-6 left-6 bg-brand-card/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-brand-border flex items-center gap-3 shadow-brand-md pointer-events-none" style={{ zIndex: 1000 }}>
          <AlertCircle className="w-5 h-5 text-brand-danger animate-bounce" />
          <div>
            <span className="text-[10px] font-bold text-brand-text-sub uppercase tracking-wider block">Critical Safety Shield</span>
            <span className="text-xs text-brand-text-main font-semibold block">Fenced in Connaught Place Zone</span>
          </div>
        </div>
      </div>
    </div>
  );
}
