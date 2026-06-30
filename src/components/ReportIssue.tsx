import React, { useState, useRef, useEffect } from 'react';
import { Issue, IssueSeverity, IssueStatus } from '../types';
import { translations, MAP_CENTER } from '../mockData';
import { Camera, Image as ImageIcon, MapPin, Sparkles, CheckCircle2, AlertTriangle, ShieldCheck, Loader2, ArrowLeft, Search, Compass, Map, Mic, MicOff } from 'lucide-react';

interface ReportIssueProps {
  lang: 'en' | 'es' | 'hi' | 'ja' | 'mr';
  issues: Issue[];
  currentUser: { name: string; email: string } | null;
  onIssueAdded: (newIssue: Issue, isDuplicate: boolean, duplicateOfId?: string) => Promise<boolean>;
  onCancel: () => void;
}

export default function ReportIssue({ lang, issues, currentUser, onIssueAdded, onCancel }: ReportIssueProps) {
  const t = translations[lang];
  const [dragActive, setDragActive] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [mapSelection, setMapSelection] = useState<[number, number]>(MAP_CENTER);
  const [manualDescription, setManualDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Web Speech API dictation states
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Reset/cleanup active listener on language switch
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
      setIsListening(false);
    }
  }, [lang]);

  const startListening = () => {
    setSpeechError(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError("Web Speech API is not supported in this browser. Please try Chrome or Safari.");
      return;
    }

    try {
      if (!recognitionRef.current) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = false;
        
        // Select language tags
        if (lang === 'hi') rec.lang = 'hi-IN';
        else if (lang === 'mr') rec.lang = 'mr-IN';
        else if (lang === 'es') rec.lang = 'es-ES';
        else if (lang === 'ja') rec.lang = 'ja-JP';
        else rec.lang = 'en-IN';

        rec.onstart = () => {
          setIsListening(true);
        };

        rec.onresult = (event: any) => {
          const transcript = event.results[event.results.length - 1][0].transcript;
          if (analysisResult) {
            const currentDesc = analysisResult.description || '';
            const newDesc = currentDesc ? `${currentDesc} ${transcript}` : transcript;
            setAnalysisResult({ ...analysisResult, description: newDesc });
          } else {
            setManualDescription(prev => prev ? `${prev} ${transcript}` : transcript);
          }
        };

        rec.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
          if (event.error === 'not-allowed') {
            setSpeechError("Microphone access is blocked. Please allow microphone permission in your browser or click on the URL in a new tab.");
          } else if (event.error === 'no-speech') {
            setSpeechError("No speech detected. Please speak clearly into your microphone.");
          } else {
            setSpeechError(`Speech recognition error: ${event.error}`);
          }
        };

        rec.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = rec;
      }

      recognitionRef.current.start();
    } catch (err) {
      console.error("Error starting speech recognition:", err);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsListening(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // India location search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ name: string; lat: number; lon: number }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const INDIAN_PRESETS = [
    { name: 'Connaught Place, New Delhi', lat: 28.6304, lon: 77.2177 },
    { name: 'Rajiv Chowk, New Delhi', lat: 28.6328, lon: 77.2195 },
    { name: 'India Gate, New Delhi', lat: 28.6129, lon: 77.2295 },
    { name: 'Marine Drive, Mumbai', lat: 18.9430, lon: 72.8228 },
    { name: 'Gateway of India, Mumbai', lat: 18.9220, lon: 72.8347 },
    { name: 'Shaniwar Wada, Pune', lat: 18.5194, lon: 73.8553 },
    { name: 'Shivaji Nagar, Pune', lat: 18.5312, lon: 73.8446 },
    { name: 'MG Road, Bengaluru', lat: 12.9738, lon: 77.6119 },
    { name: 'Charminar, Hyderabad', lat: 17.3616, lon: 78.4747 },
    { name: 'Howrah Bridge, Kolkata', lat: 22.5851, lon: 88.3468 }
  ];

  const handleSearchLocation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      const queryLower = searchQuery.toLowerCase();
      const localMatches = INDIAN_PRESETS.filter(p => 
        p.name.toLowerCase().includes(queryLower)
      );

      // Search OpenStreetMap Nominatim with India country filter
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=in&limit=5`, {
        headers: {
          'Accept-Language': lang === 'mr' ? 'mr,en' : lang === 'hi' ? 'hi,en' : 'en'
        }
      });
      
      if (!res.ok) {
        throw new Error('Search failed');
      }

      const data = await res.json();
      
      const parsedResults = data.map((item: any) => ({
        name: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon)
      }));

      // Merge local matching and live matching
      const combined = [...localMatches];
      parsedResults.forEach((remote: any) => {
        const isDuplicate = combined.some(local => 
          Math.abs(local.lat - remote.lat) < 0.0001 && Math.abs(local.lon - remote.lon) < 0.0001
        );
        if (!isDuplicate) {
          combined.push(remote);
        }
      });

      if (combined.length === 0) {
        setSearchError(lang === 'mr' ? 'कोणतेही ठिकाण आढळले नाही.' : lang === 'hi' ? 'कोई स्थान नहीं मिला।' : 'No matching Indian places found.');
      } else {
        setSearchResults(combined);
      }
    } catch (err) {
      console.error('Location search error:', err);
      const queryLower = searchQuery.toLowerCase();
      const localMatches = INDIAN_PRESETS.filter(p => 
        p.name.toLowerCase().includes(queryLower)
      );
      if (localMatches.length > 0) {
        setSearchResults(localMatches);
      } else {
        setSearchError(lang === 'mr' ? 'कनेक्शन एरर. कृपया पुन्हा प्रयत्न करा.' : lang === 'hi' ? 'कनेक्शन त्रुटि। कृपया पुनः प्रयास करें।' : 'Connection error. Try searching popular places.');
      }
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectPlace = (lat: number, lon: number, name: string) => {
    setMapSelection([lat, lon]);
    if (miniMapRef.current) {
      miniMapRef.current.setView([lat, lon], 15);
    }
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lon]);
    }
    setSearchResults([]);
    setSearchQuery(name);
  };

  const handleQuickCity = (city: string) => {
    const coords: { [key: string]: [number, number] } = {
      'Delhi': [28.6139, 77.2090],
      'Mumbai': [18.9750, 72.8258],
      'Pune': [18.5204, 73.8567],
      'Bangalore': [12.9716, 77.5946],
      'Kolkata': [22.5726, 88.3639],
    };
    if (coords[city]) {
      const [lat, lon] = coords[city];
      setMapSelection([lat, lon]);
      if (miniMapRef.current) {
        miniMapRef.current.setView([lat, lon], 14);
      }
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lon]);
      }
      setSearchQuery(city);
    }
  };

  // Micro Leaflet Map for reporting location selection
  const miniMapContainerRef = useRef<HTMLDivElement | null>(null);
  const miniMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Initialize Map
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !miniMapContainerRef.current) return;

    if (!miniMapRef.current) {
      // Randomize coordinates slightly around Indian city center to make it feel localized and realistic
      const offsetLat = (Math.random() - 0.5) * 0.008;
      const offsetLng = (Math.random() - 0.5) * 0.008;
      const initialCoords: [number, number] = [MAP_CENTER[0] + offsetLat, MAP_CENTER[1] + offsetLng];
      setMapSelection(initialCoords);

      miniMapRef.current = L.map(miniMapContainerRef.current, {
        zoomControl: false,
        scrollWheelZoom: false
      }).setView(initialCoords, 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(miniMapRef.current);

      const customIcon = L.divIcon({
        className: 'custom-report-pin',
        html: `<div class="w-6 h-6 rounded-full bg-brand-primary border-2 border-white animate-pulse shadow-brand-md"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      markerRef.current = L.marker(initialCoords, { icon: customIcon, draggable: true }).addTo(miniMapRef.current);
      
      markerRef.current.on('dragend', () => {
        const position = markerRef.current.getLatLng();
        setMapSelection([position.lat, position.lng]);
      });

      miniMapRef.current.on('click', (e: any) => {
        const coords = e.latlng;
        markerRef.current.setLatLng(coords);
        setMapSelection([coords.lat, coords.lng]);
      });
    }

    return () => {
      if (miniMapRef.current) {
        miniMapRef.current.remove();
        miniMapRef.current = null;
      }
    };
  }, []);

  // Calculate distance between two points in meters (Haversine Formula)
  const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // in meters
  };

  // Convert uploaded image file to Base64
  const processImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setImage(base64);
      await analyzeImageWithAI(base64, file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  // Trigger base64 processing inside camera simulation
  const handleSimulateCapture = (category: string) => {
    const samples: { [key: string]: string } = {
      pothole: '/src/assets/images/severe_deep_pothole_1782758350443.jpg',
      waste: '/src/assets/images/overflowing_waste_bin_1782758400382.jpg',
      electric: '/src/assets/images/exposed_voltage_wire_1782758365580.jpg',
      water: '/src/assets/images/major_water_burst_1782758382661.jpg'
    };
    
    setAnalyzing(true);
    setImage(samples[category]);
    
    // Simulate Vision API
    setTimeout(() => {
      const responses: { [key: string]: any } = {
        pothole: {
          issueType: 'pothole',
          title: 'Deep Street Pothole near Janpath',
          severity: 'high',
          riskScore: 78,
          confidence: 96,
          department: 'Road & Highway Maintenance Dept',
          repairTime: '48 Hours',
          description: 'A deep pothole has eroded the road asphalt surface on Janpath Road. High safety hazard to motorcyclists, scooters, and cyclists.',
          isEmergency: false,
          requiredOfficerType: 'Civil Engineer',
          budgetSuggestion: '₹90,000',
          equipmentSuggestion: ['Asphalt cutter', 'Steamroller', 'Warning signs']
        },
        waste: {
          issueType: 'garbage',
          title: 'Overflowing Trash Containers at Connaught Place',
          severity: 'medium',
          riskScore: 43,
          confidence: 98,
          department: 'Sanitation & Refuse Management Dept',
          repairTime: '12 Hours',
          description: 'Refuse bins have breached threshold capacity on Connaught Place inner circle. Attracting stray dogs and obstructing pedestrian clearance.',
          isEmergency: false,
          requiredOfficerType: 'Sanitation Inspector',
          budgetSuggestion: '₹25,000',
          equipmentSuggestion: ['Garbage truck', 'Disinfectant spray', 'Industrial brooms']
        },
        electric: {
          issueType: 'electricity',
          title: 'Exposed Electrical Line near Rajiv Chowk',
          severity: 'urgent',
          riskScore: 94,
          confidence: 99,
          department: 'Emergency Utility Safety Board',
          repairTime: 'Immediate Action Required',
          description: 'Damaged structural conduit exposing dynamic conductor wires near Rajiv Chowk Metro Gate 3. High electrocution risk during rain cycles.',
          isEmergency: true,
          requiredOfficerType: 'Emergency Electrician',
          budgetSuggestion: '₹2,10,000',
          equipmentSuggestion: ['Insulated crane', 'Conduit tubing', 'Circuit breaker testers']
        },
        water: {
          issueType: 'water_leak',
          title: 'High Pressure Water Line Burst near CP Block E',
          severity: 'high',
          riskScore: 75,
          confidence: 95,
          department: 'Hydraulics & City Water Works Office',
          repairTime: '24 Hours',
          description: 'Water sub-main pipeline breach causing heavy water pool aggregation across the roadway. Reduces traction safety and wastes potable water.',
          isEmergency: false,
          requiredOfficerType: 'Hydraulics Engineer',
          budgetSuggestion: '₹1,50,000',
          equipmentSuggestion: ['Excavator', 'Pipe clamps', 'Water pumps']
        }
      };

      setAnalysisResult(responses[category]);
      setAnalyzing(false);
    }, 1400);
  };

  const analyzeImageWithAI = async (base64Data: string, fileName: string = '') => {
    setAnalyzing(true);
    setAnalysisResult(null);

    try {
      const response = await fetch('/api/analyze-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageBase64: base64Data,
          fileName: fileName
        })
      });

      if (!response.ok) {
        throw new Error('AI analysis backend failed');
      }

      const parsed = await response.json();
      setAnalysisResult(parsed);

    } catch (err) {
      console.error("Gemini Vision pipeline error, using offline diagnostics...", err);
      
      const text = (fileName + ' ' + base64Data.slice(0, 500)).toLowerCase();
      let issueType = 'pothole';
      let title = 'Reported Pothole Location';
      let severity = 'high';
      let riskScore = 72;
      let department = 'Department of Public Transportation';
      let description = 'Visual evidence uploaded represents local asphalt distress or damage. Scheduled for priority dispatch mapping.';
      let repairTime = '48 Hours';
      let isEmergency = false;
      let requiredOfficerType = 'Civil Engineer';
      let budgetSuggestion = '₹90,000';
      let equipmentSuggestion = ['Asphalt cutter', 'Steamroller', 'Warning signs'];

      if (text.includes('garbage') || text.includes('waste') || text.includes('bin') || text.includes('trash') || text.includes('refuse') || text.includes('dump')) {
        issueType = 'garbage';
        title = 'Overflowing Public Waste Bin';
        severity = 'medium';
        riskScore = 45;
        department = 'Waste & Sanitation Dept';
        description = 'Public refuse bin is overflowing with waste scattering onto the roadside, attracting stray animals and blocking pedestrians.';
        repairTime = '24 Hours';
        requiredOfficerType = 'Sanitation Inspector';
        budgetSuggestion = '₹25,000';
        equipmentSuggestion = ['Garbage truck', 'Disinfectant spray', 'Industrial brooms'];
      } else if (text.includes('electric') || text.includes('wire') || text.includes('cable') || text.includes('voltage') || text.includes('spark') || text.includes('conduit')) {
        issueType = 'electricity';
        title = 'Exposed High Voltage Wire Cluster';
        severity = 'urgent';
        riskScore = 95;
        department = 'Electrical Grid & Power Authority';
        description = 'Exposed, messy high voltage electrical cables hanging dangerously near public pathways, posing high electrocution risk.';
        repairTime = '12 Hours';
        isEmergency = true;
        requiredOfficerType = 'Emergency Electrician';
        budgetSuggestion = '₹2,10,000';
        equipmentSuggestion = ['Insulated crane', 'Conduit tubing', 'Circuit breaker testers'];
      } else if (text.includes('water') || text.includes('leak') || text.includes('burst') || text.includes('pipe') || text.includes('flood') || text.includes('sewage')) {
        issueType = 'water_leak';
        title = 'Major Water Supply Main Burst';
        severity = 'high';
        riskScore = 82;
        department = 'Water & Sanitation Dept';
        description = 'Clean drinking water is bursting at high pressure from a cracked main supply pipe, heavily flooding the street.';
        repairTime = '12 Hours';
        requiredOfficerType = 'Hydraulics Engineer';
        budgetSuggestion = '₹1,50,000';
        equipmentSuggestion = ['Excavator', 'Pipe clamps', 'Water pumps'];
      } else if (text.includes('light') || text.includes('lamp') || text.includes('dark')) {
        issueType = 'street_light';
        title = 'Street Light Outage';
        severity = 'medium';
        riskScore = 40;
        department = 'City Lighting & Power Dept';
        description = 'Street lights are inactive, causing dark pathways and reduced security for pedestrians.';
        repairTime = '24 Hours';
        requiredOfficerType = 'Lighting Tech';
        budgetSuggestion = '₹25,000';
        equipmentSuggestion = ['Hydraulic lift truck', 'Replacement bulbs', 'Wiring loom'];
      }

      setAnalysisResult({
        issueType,
        title,
        severity,
        riskScore,
        confidence: 85,
        department,
        repairTime,
        description,
        isEmergency,
        requiredOfficerType,
        budgetSuggestion,
        equipmentSuggestion
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const isTitleValid = !!(analysisResult?.title?.trim());
  const isDescriptionValid = !!((analysisResult?.description || manualDescription)?.trim());
  const isCategoryValid = !!(analysisResult?.issueType);
  const isLocationValid = Array.isArray(mapSelection) && mapSelection.length === 2 && typeof mapSelection[0] === 'number' && typeof mapSelection[1] === 'number';
  const isImageValid = !!image;

  const isFormValid = isTitleValid && isDescriptionValid && isCategoryValid && isLocationValid && isImageValid;

  const handleFinalSubmit = async () => {
    if (!isFormValid) return;
    setSubmitting(true);

    const reporterEmail = currentUser?.email || 'anonymous@civictaskforce.org';
    const reporterName = currentUser?.name || 'Anonymous Citizen';

    // Duplicate Detection Logic:
    // Look for active/submitted issues of SAME type within 150 meters from our mapSelection
    const thresholdDistance = 150; // meters
    let foundDuplicate: Issue | null = null;

    for (const is of issues) {
      if (is.type === analysisResult.issueType && is.status !== 'resolved' && is.status !== 'closed') {
        const dist = getDistanceInMeters(mapSelection[0], mapSelection[1], is.latitude, is.longitude);
        if (dist <= thresholdDistance) {
          foundDuplicate = is;
          break;
        }
      }
    }

    let success = false;
    if (foundDuplicate) {
      // Prompt user or handle duplicate automatically
      // We will automatically route it as a "Verification" of the existing issue, which increments its upvotes/credibility score
      const confirmed = window.confirm(
        `AI Geo-Spatial Alert:\nWe detected an existing reported ${foundDuplicate.title} within ${thresholdDistance}m of this spot.\n\nTo prevent duplicate team dispatches, we have combined your report into the active ticket. You will receive +50 XP and credit for this validation!`
      );
      
      success = await onIssueAdded(foundDuplicate, true, foundDuplicate.id);
    } else {
      // Normal new unique issue creation
      const newIssue: Issue = {
        id: 'issue_' + Math.random().toString(36).substring(2, 9),
        title: analysisResult.title,
        description: analysisResult.description || manualDescription || 'No further explanation provided.',
        image: image || 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600',
        type: analysisResult.issueType,
        severity: analysisResult.severity as IssueSeverity,
        status: 'reported',
        latitude: mapSelection[0],
        longitude: mapSelection[1],
        reporterName,
        reporterEmail,
        reportedAt: new Date().toISOString(),
        department: analysisResult.department,
        riskScore: analysisResult.riskScore,
        confidence: analysisResult.confidence || 90,
        repairTime: analysisResult.repairTime || '48 Hours',
        upvotes: 1,
        verifiedBy: [reporterEmail],
        isEmergency: analysisResult.isEmergency || false,
        isDuplicateOf: null,
        assignedOfficer: null,
        inspectionReport: null,
        resourceAllocation: null,
        timeline: [
          {
            status: 'reported',
            timestamp: new Date().toISOString(),
            note: 'Incident registered in smart municipal feed with active AI vision scan and coordinate mapping.',
            actor: 'System Core'
          }
        ]
      };

      success = await onIssueAdded(newIssue, false);
    }

    if (success) {
      setImage(null);
      setAnalysisResult(null);
      setManualDescription('');
    }

    setSubmitting(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back to dashboard */}
      <button
        onClick={onCancel}
        className="inline-flex items-center gap-2 text-sm font-medium text-brand-text-sub hover:text-brand-text-main mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Cancel</span>
      </button>

      <h1 className="text-3xl font-display font-bold text-brand-text-main flex items-center gap-2.5 mb-2">
        <Camera className="w-8 h-8 text-brand-primary" />
        <span>{t.reportNewIssue}</span>
      </h1>
      <p className="text-brand-text-sub mb-8">
        Take a picture of the civic problem. Our server-side Gemini AI classifies, assesses risk, and routes it automatically.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: File uploader or simulation capture */}
        <div className="space-y-6">
          <div className="bg-brand-card border border-brand-border p-6 rounded-3xl shadow-brand-sm">
            <h3 className="font-bold text-brand-text-main mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-brand-text-sub" />
              <span>1. Click or Drag Issue Photo</span>
            </h3>

            {/* Drag & Drop Area */}
            <div
              id="drop-zone"
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all flex flex-col items-center justify-center min-h-[220px] relative overflow-hidden cursor-pointer ${
                dragActive 
                  ? 'border-brand-primary bg-brand-primary-light' 
                  : 'border-brand-border bg-brand-bg hover:border-brand-primary/50'
              }`}
            >
              <input
                type="file"
                id="file-upload"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />

              {image ? (
                <div className="relative w-full h-full">
                  <img 
                    src={image} 
                    alt="Uploaded issue" 
                    className="max-h-[200px] object-cover rounded-xl mx-auto shadow-brand-md"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-md font-semibold">
                    Change Photo
                  </div>
                </div>
              ) : (
                <>
                  <Camera className="w-10 h-10 text-brand-text-sub mb-3" />
                  <p className="text-sm font-semibold text-brand-text-main">
                    Drag photo here or tap to select
                  </p>
                  <p className="text-xs text-brand-text-sub mt-1">
                    Supports JPEG, PNG up to 10MB
                  </p>
                </>
              )}
            </div>

            {/* Simulated preset quick caps */}
            <div className="mt-6">
              <span className="text-xs font-bold text-brand-text-sub uppercase tracking-wider block mb-3">Or simulate webcam capture:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  id="capture-pothole"
                  onClick={() => handleSimulateCapture('pothole')}
                  className="px-3 py-2 text-xs font-medium border border-brand-border hover:border-brand-primary bg-brand-bg rounded-xl cursor-pointer hover:text-brand-primary transition-colors text-brand-text-main"
                >
                  🛣️ Pothole
                </button>
                <button
                  id="capture-waste"
                  onClick={() => handleSimulateCapture('waste')}
                  className="px-3 py-2 text-xs font-medium border border-brand-border hover:border-brand-primary bg-brand-bg rounded-xl cursor-pointer hover:text-brand-primary transition-colors text-brand-text-main"
                >
                  🗑️ Garbage
                </button>
                <button
                  id="capture-electric"
                  onClick={() => handleSimulateCapture('electric')}
                  className="px-3 py-2 text-xs font-medium border border-brand-border hover:border-brand-primary bg-brand-bg rounded-xl cursor-pointer hover:text-brand-primary transition-colors text-brand-text-main"
                >
                  ⚡ Electric
                </button>
                <button
                  id="capture-water"
                  onClick={() => handleSimulateCapture('water')}
                  className="px-3 py-2 text-xs font-medium border border-brand-border hover:border-brand-primary bg-brand-bg rounded-xl cursor-pointer hover:text-brand-primary transition-colors text-brand-text-main"
                >
                  💧 Water Leak
                </button>
              </div>
            </div>
          </div>

          {/* Location Map selection */}
          <div className="bg-brand-card border border-brand-border p-6 rounded-3xl shadow-brand-sm space-y-4">
            <h3 className="font-bold text-brand-text-main flex items-center gap-2">
              <MapPin className="w-5 h-5 text-brand-primary" />
              <span>{lang === 'mr' ? '२. घटनास्थळ निवडा' : lang === 'hi' ? '2. स्थान चुनें' : '2. Select Problem Location'}</span>
            </h3>

            {/* India Place Search Input */}
            <div className="space-y-2">
              <form onSubmit={handleSearchLocation} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-sub" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.searchPlacePlaceholder || 'Search places in India...'}
                    className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl bg-brand-bg border border-brand-border text-brand-text-main placeholder-brand-text-sub focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searchLoading}
                  className="px-4 py-2.5 bg-brand-primary text-white text-sm font-semibold rounded-xl hover:bg-opacity-90 disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {searchLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Compass className="w-4 h-4" />
                  )}
                  <span>{t.searchBtn || 'Search'}</span>
                </button>
              </form>

              {/* Quick City Filters */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                <span className="text-brand-text-sub font-medium mr-1">{t.popularPlaces || 'Popular'}:</span>
                {['Delhi', 'Mumbai', 'Pune', 'Bangalore', 'Kolkata'].map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => handleQuickCity(city)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-brand-bg hover:bg-brand-primary hover:text-white border border-brand-border hover:border-brand-primary text-brand-text-main transition-all cursor-pointer"
                  >
                    {city === 'Delhi' && (lang === 'mr' ? 'दिल्ली' : lang === 'hi' ? 'दिल्ली' : 'Delhi')}
                    {city === 'Mumbai' && (lang === 'mr' ? 'मुंबई' : lang === 'hi' ? 'मुंबई' : 'Mumbai')}
                    {city === 'Pune' && (lang === 'mr' ? 'पुणे' : lang === 'hi' ? 'पुणे' : 'Pune')}
                    {city === 'Bangalore' && (lang === 'mr' ? 'बंगळुरू' : lang === 'hi' ? 'बेंगलुरु' : 'Bangalore')}
                    {city === 'Kolkata' && (lang === 'mr' ? 'कोलकाता' : lang === 'hi' ? 'कोलकाता' : 'Kolkata')}
                  </button>
                ))}
              </div>

              {/* Search Error */}
              {searchError && (
                <div className="text-xs text-red-500 font-medium">⚠️ {searchError}</div>
              )}

              {/* Search Results Dropdown/List */}
              {searchResults.length > 0 && (
                <div className="max-h-[160px] overflow-y-auto border border-brand-border bg-brand-card rounded-xl p-1 shadow-brand-md divide-y divide-brand-border relative z-50">
                  {searchResults.map((result, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectPlace(result.lat, result.lon, result.name)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-brand-bg transition-colors flex flex-col gap-0.5 text-brand-text-main rounded-lg"
                    >
                      <span className="font-bold line-clamp-1">{result.name.split(',')[0]}</span>
                      <span className="text-[10px] text-brand-text-sub line-clamp-1">{result.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div 
              ref={miniMapContainerRef} 
              className="w-full h-[180px] rounded-2xl overflow-hidden shadow-inner border border-brand-border relative z-10"
            ></div>
            
            <div className="flex items-center justify-between text-xs text-brand-text-sub bg-brand-bg px-3 py-2 rounded-xl border border-brand-border">
              <span className="font-mono">
                📍 {mapSelection[0].toFixed(5)}, {mapSelection[1].toFixed(5)}
              </span>
              <span>
                {lang === 'mr' ? 'नकाशावर टॅप करा किंवा पिन ड्रॅग करा' : lang === 'hi' ? 'नक्शे पर टैप करें या पिन खींचें' : 'Tap map or drag pin to adjust'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: AI Analysis loading state or confirmation */}
        <div className="space-y-6">
          {/* Skeleton Load */}
          {analyzing && (
            <div className="bg-brand-card border border-brand-border p-6 rounded-3xl shadow-brand-sm animate-pulse">
              <div className="flex items-center gap-2 mb-6">
                <Loader2 className="w-5 h-5 text-brand-primary animate-spin" />
                <span className="font-bold text-sm text-brand-text-main">AI Vision Engine is analyzing...</span>
              </div>
              <div className="space-y-4">
                <div className="h-4 bg-brand-border rounded-md w-1/3"></div>
                <div className="h-8 bg-brand-border rounded-md w-full"></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-12 bg-brand-border rounded-md"></div>
                  <div className="h-12 bg-brand-border rounded-md"></div>
                </div>
                <div className="h-16 bg-brand-border rounded-md w-full"></div>
              </div>
            </div>
          )}

          {/* Analysis Ready */}
          {!analyzing && analysisResult && (
            <div className="bg-brand-card border border-brand-border p-6 rounded-3xl shadow-brand-md space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-brand-success">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                  <span className="font-bold text-sm">Gemini Diagnostics Ready</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-brand-text-sub">
                  CONFIDENCE: {analysisResult.confidence}%
                </span>
              </div>

              {/* Title Input */}
              <div>
                <label className="text-xs font-semibold text-brand-text-sub block uppercase mb-1">Generated Title</label>
                <input
                  type="text"
                  value={analysisResult.title}
                  onChange={(e) => setAnalysisResult({ ...analysisResult, title: e.target.value })}
                  className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-xl text-sm font-bold text-brand-text-main"
                />
              </div>

              {/* Badges Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 bg-brand-bg rounded-2xl border border-brand-border">
                  <span className="text-[10px] text-brand-text-sub uppercase font-semibold block">{t.issueType}</span>
                  <select
                    value={analysisResult.issueType}
                    onChange={(e) => {
                      const newType = e.target.value;
                      const suggestedDept = newType === 'electricity' ? 'Electrical Grid & Power Authority' :
                                            newType === 'water_leak' ? 'Water & Sanitation Dept' :
                                            newType === 'garbage' ? 'Waste & Sanitation Dept' :
                                            newType === 'street_light' ? 'City Lighting & Power Dept' :
                                            'Road & Highway Maintenance Dept';
                      const suggestedOfficer = newType === 'electricity' ? 'Emergency Electrician' :
                                               newType === 'water_leak' ? 'Hydraulics Engineer' :
                                               newType === 'garbage' ? 'Sanitation Inspector' :
                                               newType === 'street_light' ? 'Lighting Tech' :
                                               'Civil Engineer';
                      const suggestedBudget = newType === 'electricity' ? '₹2,10,000' :
                                              newType === 'water_leak' ? '₹1,50,000' :
                                              newType === 'pothole' ? '₹90,000' : '₹25,000';
                      setAnalysisResult({ 
                        ...analysisResult, 
                        issueType: newType,
                        department: suggestedDept,
                        requiredOfficerType: suggestedOfficer,
                        budgetSuggestion: suggestedBudget
                      });
                    }}
                    className="text-sm font-bold capitalize text-brand-text-main bg-transparent border-none p-0 mt-1 focus:outline-none w-full cursor-pointer focus:ring-0"
                  >
                    <option value="pothole" className="text-black">Pothole</option>
                    <option value="garbage" className="text-black">Garbage / Waste</option>
                    <option value="electricity" className="text-black">Electricity / Wire</option>
                    <option value="water_leak" className="text-black">Water Leak</option>
                    <option value="street_light" className="text-black">Street Light</option>
                  </select>
                </div>

                <div className="p-3.5 bg-brand-bg rounded-2xl border border-brand-border">
                  <span className="text-[10px] text-brand-text-sub uppercase font-semibold block">{t.severity}</span>
                  <span className={`text-sm font-extrabold uppercase block mt-1 ${
                    analysisResult.severity === 'urgent' ? 'text-brand-danger' :
                    analysisResult.severity === 'high' ? 'text-brand-warning' :
                    analysisResult.severity === 'medium' ? 'text-brand-warning' :
                    'text-brand-success'
                  }`}>
                    {analysisResult.severity}
                  </span>
                </div>

                <div className="p-3.5 bg-brand-bg rounded-2xl border border-brand-border">
                  <span className="text-[10px] text-brand-text-sub uppercase font-semibold block">{t.riskScore}</span>
                  <span className="text-sm font-mono font-extrabold text-brand-primary block mt-1">{analysisResult.riskScore}/100</span>
                </div>

                <div className="p-3.5 bg-brand-bg rounded-2xl border border-brand-border">
                  <span className="text-[10px] text-brand-text-sub uppercase font-semibold block">Repair Deadline</span>
                  <span className="text-sm font-bold text-brand-text-main block mt-1">{analysisResult.repairTime}</span>
                </div>
              </div>

              {/* Department Routing */}
              <div className="p-4 bg-brand-primary-light border border-brand-primary/20 rounded-2xl">
                <span className="text-[10px] text-brand-primary uppercase font-bold tracking-wider block">Recommended Dispatch Dept</span>
                <span className="text-sm font-bold text-brand-primary block mt-1">{analysisResult.department}</span>
              </div>

              {/* Short explanation */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-brand-text-sub uppercase">{t.explanation}</label>
                  
                  {/* Speech to text mic toggle */}
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      isListening 
                        ? 'bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse' 
                        : 'bg-brand-bg text-brand-text-sub border border-brand-border hover:bg-brand-card hover:text-brand-text-main'
                    }`}
                  >
                    {isListening ? (
                      <>
                        <MicOff className="w-3.5 h-3.5" />
                        <span>Stop Dictation</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5" />
                        <span>Dictate (Voice)</span>
                      </>
                    )}
                  </button>
                </div>
                
                {speechError && (
                  <div className="mb-2 p-3 bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-[11px] rounded-xl flex items-center justify-between">
                    <span>{speechError}</span>
                    <button 
                      type="button" 
                      onClick={() => setSpeechError(null)} 
                      className="text-[10px] font-bold underline hover:text-brand-danger/80 ml-2"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
                
                <textarea
                  rows={3}
                  value={analysisResult.description || manualDescription}
                  onChange={(e) => {
                    setAnalysisResult({ ...analysisResult, description: e.target.value });
                    setManualDescription(e.target.value);
                  }}
                  placeholder={isListening ? "Listening... Speak now..." : "Add details or use voice dictation..."}
                  className={`w-full px-4 py-3 bg-brand-bg border rounded-xl text-xs text-brand-text-main focus:outline-hidden transition-colors ${
                    isListening ? 'border-red-500/45 focus:border-red-500 ring-1 ring-red-500/10' : 'border-brand-border focus:border-brand-primary'
                  }`}
                />
              </div>

              {/* Emergency indicator warning */}
              {analysisResult.isEmergency && (
                <div className="p-4 bg-brand-danger/10 border border-brand-danger/20 text-brand-danger rounded-2xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 animate-bounce" />
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider block">{t.emergencyMode}</span>
                    <span className="text-xs mt-0.5 block">{t.emergencyDesc}</span>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <button
                id="submit-verified-report"
                onClick={handleFinalSubmit}
                disabled={submitting || !isFormValid}
                className="w-full py-4 bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-50 text-white font-bold rounded-2xl shadow-brand-lg flex items-center justify-center gap-2 cursor-pointer transition-all transform active:scale-[0.98]"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-5 h-5" />
                )}
                <span>{t.submitReport}</span>
              </button>
            </div>
          )}

          {/* Empty Prompt */}
          {!analyzing && !analysisResult && (
            <div className="bg-brand-bg border border-brand-border rounded-3xl p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
              <Sparkles className="w-12 h-12 text-brand-primary/50 mb-4 animate-pulse" />
              <h3 className="font-bold text-brand-text-main mb-1">AI Ready for Intake</h3>
              <p className="text-xs text-brand-text-sub max-w-xs">
                Upload or capture an issue photograph on the left to activate Gemini Vision analysis.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
