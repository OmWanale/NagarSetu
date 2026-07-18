import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  FileText, 
  MapPin, 
  Image as ImageIcon, 
  ArrowLeft, 
  Send, 
  CheckCircle2, 
  Loader2, 
  Clock, 
  ChevronRight, 
  User, 
  ShieldCheck, 
  Trash2,
  AlertTriangle,
  Info,
  Sun,
  Moon
} from 'lucide-react';

// Fix Leaflet marker icon asset mapping in Vite
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIconRetina,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// A custom Map click-listener component to drop a pin
function LocationSelector({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return position === null ? null : (
    <Marker position={position} />
  );
}

export default function CitizenPortal() {
  const { user, token, logout, apiUrl, theme, toggleTheme } = useAuth();
  const navigate = useNavigate();

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Map Default Position (Nagar City center coordinates)
  const defaultCenter = [12.9716, 77.5946]; 

  // State Variables
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  // Form Fields
  const [description, setDescription] = useState('');
  const [country, setCountry] = useState('India');
  const [state, setState] = useState('Karnataka');
  const [district, setDistrict] = useState('Bengaluru Urban');
  const [city, setCity] = useState('Bengaluru');
  const [locality, setLocality] = useState('Malleswaram');
  const [pincode, setPincode] = useState('560003');
  const [formattedAddress, setFormattedAddress] = useState('Malleswaram, Bengaluru, Bengaluru Urban, Karnataka - 560003, India');
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const [pinPosition, setPinPosition] = useState(defaultCenter);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  // Trigger Nominatim reverse-geocoding when pin drops
  useEffect(() => {
    if (!pinPosition) return;
    const fetchGeocode = async () => {
      setGeocodingLoading(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pinPosition[0]}&lon=${pinPosition[1]}&format=json&accept-language=en`);
        if (res.ok) {
          const data = await res.json();
          const addr = data.address || {};
          
          setCountry(addr.country || 'India');
          setState(addr.state || addr.state_district || 'Karnataka');
          setDistrict(addr.county || addr.district || 'Bengaluru Urban');
          setCity(addr.city || addr.town || addr.village || addr.suburb || 'Bengaluru');
          setLocality(addr.neighbourhood || addr.suburb || addr.residential || addr.road || 'Malleswaram');
          setPincode(addr.postcode || '');
          setFormattedAddress(data.display_name || `${addr.neighbourhood || addr.suburb || 'Malleswaram'}, ${addr.city || 'Bengaluru'}, ${addr.state || 'Karnataka'}`);
        }
      } catch (err) {
        console.warn("OSM Nominatim API error:", err);
      } finally {
        setGeocodingLoading(false);
      }
    };
    fetchGeocode();
  }, [pinPosition]);

  // Submit AI Processing Modal State
  const [submitStatus, setSubmitStatus] = useState(null); // 'uploading', 'classifying', 'duplication', 'gemini', 'success', null
  const [submittedId, setSubmittedId] = useState(null);
  const [aiPrediction, setAiPrediction] = useState(null);

  // Load citizen complaints from backend DB
  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const response = await fetch(`${apiUrl}/api/complaints/my-complaints`, { headers });
      if (response.ok) {
        const data = await response.json();
        setComplaints(data);
      } else {
        console.error("Error response fetching complaints:", response.status);
        setComplaints([]);
      }
    } catch (e) {
      console.error("Backend error fetching citizen complaints:", e);
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchComplaints();
    }
  }, [user]);

  // Image upload handler
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Complaint Form directly to Backend API
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitStatus('uploading');
    
    setTimeout(async () => {
      setSubmitStatus('classifying');
      
      setTimeout(async () => {
        setSubmitStatus('duplication');
        
        setTimeout(async () => {
          setSubmitStatus('gemini');
          
          try {
            const payload = {
              description,
              country,
              state,
              district,
              city,
              locality,
              pincode,
              formatted_address: formattedAddress,
              latitude: pinPosition ? pinPosition[0] : defaultCenter[0],
              longitude: pinPosition ? pinPosition[1] : defaultCenter[1],
              image_data: imagePreview
            };

            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(`${apiUrl}/api/complaints`, {
              method: 'POST',
              headers,
              body: JSON.stringify(payload)
            });

            if (response.ok) {
              const data = await response.json();
              setAiPrediction(data);
              setSubmittedId(data.id);
              setSubmitStatus('success');
              fetchComplaints(); // Refresh list from backend database
            } else {
              const errJson = await response.json().catch(() => ({}));
              throw new Error(errJson.detail || "API Submission failed");
            }
          } catch (err) {
            console.error("Backend API error on submission:", err);
            alert(`Failed to submit complaint: ${err.message || 'Network error'}`);
            setSubmitStatus(null);
          }
        }, 1200);
      }, 1200);
    }, 1000);
  };

  // Clean form
  const resetForm = () => {
    setDescription('');
    setImageFile(null);
    setImagePreview(null);
    setPinPosition(defaultCenter);
    setSubmitStatus(null);
    setAiPrediction(null);
    setSubmittedId(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <nav className="w-full bg-slate-900/60 border-b border-slate-800 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="bg-brand-500 text-slate-950 p-1.5 rounded-md font-bold">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="font-extrabold text-xl font-['Outfit']">NagarSetu</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400">
              Citizen Portal
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="text-slate-400 hover:text-white p-2 rounded-lg bg-slate-900 border border-slate-800 transition-all flex items-center justify-center shrink-0"
              title={theme === 'dark' ? "Toggle Light Mode" : "Toggle Dark Mode"}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-400" />}
            </button>

            <div className="flex items-center space-x-2 text-sm text-slate-300">
              <User className="h-4 w-4 text-slate-400" />
              <span>{user?.full_name}</span>
            </div>
            <button 
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Layout */}
      <div className="max-w-7xl mx-auto px-6 py-8 flex-grow w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Submit Complaint Form (40%) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
            <h2 className="text-xl font-bold font-['Outfit'] mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand-400" />
              File New Complaint
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Describe the Issue
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide details about the issue (e.g. Broken water pipe leaking near central post office, street lights not working in Block B...)"
                  rows={4}
                  required
                  className="w-full text-sm bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-slate-200"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    State
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    required
                    className="w-full text-sm bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-500 text-slate-300"
                    placeholder="E.g., Maharashtra"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    District
                  </label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    required
                    className="w-full text-sm bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-500 text-slate-300"
                    placeholder="E.g., Mumbai City"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    City / Town
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    className="w-full text-sm bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-500 text-slate-300"
                    placeholder="E.g., Mumbai"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Area / Locality
                  </label>
                  <input
                    type="text"
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    required
                    className="w-full text-sm bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-500 text-slate-300"
                    placeholder="E.g., Dadar"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full text-sm bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-500 text-slate-300"
                    placeholder="E.g., 400028"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Attach Photo (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="w-full text-sm bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 flex items-center justify-between text-slate-400 hover:border-slate-700 transition">
                      <span className="truncate">{imageFile ? imageFile.name : 'Choose file...'}</span>
                      <ImageIcon className="h-4.5 w-4.5 text-slate-500 shrink-0" />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex justify-between">
                  <span>Detected Address</span>
                  {geocodingLoading && <span className="text-[10px] text-brand-400 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Fetching location...</span>}
                </label>
                <textarea
                  value={formattedAddress}
                  onChange={(e) => setFormattedAddress(e.target.value)}
                  rows={2}
                  className="w-full text-xs bg-slate-950/40 border border-slate-850 rounded-xl px-3 py-2 placeholder-slate-700 focus:outline-none focus:border-brand-500 text-slate-400 leading-relaxed"
                  placeholder="Drop a pin on map to auto-fill full address details..."
                />
              </div>

              {imagePreview && (
                <div className="relative mt-2 border border-slate-800 rounded-xl overflow-hidden max-h-40">
                  <img src={imagePreview} alt="Complaint preview" className="w-full h-full object-cover" />
                  <button 
                    type="button" 
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute top-2 right-2 bg-slate-950/80 hover:bg-red-500 p-1.5 rounded-lg border border-slate-800 hover:border-red-600 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex justify-between">
                  <span>Pin Location on Map</span>
                  <span className="text-slate-500 text-[10px] font-normal normal-case">Click map to drop marker</span>
                </label>
                
                <div className="h-44 w-full rounded-xl overflow-hidden border border-slate-800 relative z-10">
                  <MapContainer 
                    center={defaultCenter} 
                    zoom={12} 
                    style={{ height: '100%', width: '100%' }}
                    className="dark-map"
                  >
                    <TileLayer
                      url={theme === 'dark' 
                        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                      }
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <LocationSelector position={pinPosition} setPosition={setPinPosition} />
                  </MapContainer>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-brand-500 to-brand-600 text-slate-950 font-bold py-3 rounded-xl hover:shadow-lg hover:shadow-brand-500/10 active:scale-98 transition flex items-center justify-center space-x-2"
              >
                <span>Submit Complaint</span>
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>

          <div className="glass-panel p-5 rounded-2xl text-xs text-slate-400 leading-relaxed flex gap-3">
            <Info className="h-5 w-5 text-brand-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-300">How NagarSetu AI Pipeline works:</p>
              <p className="mt-1">Upon submitting, a local DistilBERT model will classify your text, an all-MiniLM Sentence Transformer checks for matching duplicates, and Gemini predictions assign the best routing department and resolution ETA immediately.</p>
            </div>
          </div>
        </div>

        {/* Right Side: Dashboard / Tracker (80%) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Dashboard Summary Card Info */}
          <div className="grid grid-cols-3 gap-4">
            <div className="glass-panel p-4 rounded-xl">
              <p className="text-xs text-slate-400 font-medium">My Complaints</p>
              <p className="text-2xl font-bold mt-1">{complaints.length}</p>
            </div>
            <div className="glass-panel p-4 rounded-xl">
              <p className="text-xs text-slate-400 font-medium text-amber-400">Pending Actions</p>
              <p className="text-2xl font-bold mt-1 text-amber-400">
                {complaints.filter(c => c.status !== 'Resolved').length}
              </p>
            </div>
            <div className="glass-panel p-4 rounded-xl">
              <p className="text-xs text-slate-400 font-medium text-emerald-400">Resolved</p>
              <p className="text-2xl font-bold mt-1 text-emerald-400">
                {complaints.filter(c => c.status === 'Resolved').length}
              </p>
            </div>
          </div>

          {/* List section */}
          <div className="glass-panel p-6 rounded-2xl flex-grow flex flex-col">
            <h2 className="text-lg font-bold font-['Outfit'] mb-4">My Submitted Issues</h2>
            
            {loading ? (
              <div className="flex-grow flex items-center justify-center flex-col py-12">
                <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
                <p className="text-xs text-slate-400 mt-2">Loading complaints database...</p>
              </div>
            ) : complaints.length === 0 ? (
              <div className="flex-grow flex flex-col items-center justify-center py-12 text-center text-slate-500 border-2 border-dashed border-slate-900 rounded-xl">
                <FileText className="h-10 w-10 text-slate-700 mb-2" />
                <p className="text-sm font-semibold text-slate-400">No complaints filed yet</p>
                <p className="text-xs mt-1">Submit your first issue using the form on the left</p>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
                {complaints.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => setSelectedComplaint(item)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer text-left flex items-start justify-between gap-4 ${
                      selectedComplaint?.id === item.id 
                        ? 'bg-slate-900 border-brand-500/50 shadow shadow-brand-500/10' 
                        : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900/80 hover:border-slate-800'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getCategoryBadgeColor(item.category)}`}>
                          {item.category}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getPriorityBadgeColor(item.priority)}`}>
                          {item.priority}
                        </span>
                      </div>
                      <p className="text-sm text-slate-200 truncate font-medium">{item.description}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="h-3 w-3" />
                        <span>Filed: {new Date(item.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{item.locality}, {item.city}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${getStatusBadgeColor(item.status)}`}>
                        {item.status.replace('_', ' ')}
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-500" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Side Detail Modal / Detail Viewer overlay */}
      {selectedComplaint && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800 h-full overflow-y-auto p-6 shadow-2xl flex flex-col justify-between animate-fade-in">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <button 
                  onClick={() => setSelectedComplaint(null)}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Close Panel
                </button>
                <span className="text-xs text-slate-500">ID: {selectedComplaint.id.substring(0, 8)}</span>
              </div>

              {/* Status Header */}
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getCategoryBadgeColor(selectedComplaint.category)}`}>
                  {selectedComplaint.category}
                </span>
                <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${getStatusBadgeColor(selectedComplaint.status)}`}>
                  {selectedComplaint.status.replace('_', ' ')}
                </span>
              </div>

              {/* Text */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Complaint Detail</h3>
                <p className="text-slate-100 text-sm leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                  {selectedComplaint.description}
                </p>
              </div>

              {/* AI Analysis Details */}
              <div className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4 text-brand-400" />
                  NagarSetu Real-Time AI Analysis
                </h3>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">AI Category Class:</span>
                    <strong className="text-slate-200 font-semibold">{selectedComplaint.category}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">AI Priority Severity:</span>
                    <strong className={`${selectedComplaint.priority === 'Critical' ? 'text-red-400' : 'text-slate-200'} font-semibold`}>
                      {selectedComplaint.priority}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Routed Department:</span>
                    <strong className="text-slate-200 font-semibold">{selectedComplaint.department || 'Public Works'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Estimated Resolution ETA:</span>
                    <strong className="text-slate-200 font-semibold">{selectedComplaint.resolution_time || '24 Hours'}</strong>
                  </div>
                </div>

                {selectedComplaint.priority_reasoning && (
                  <div className="mt-3 border-t border-slate-800/60 pt-3">
                    <span className="text-slate-400 block text-xs">Priority Logic Reasoning:</span>
                    <p className="text-slate-300 text-xs italic mt-1 leading-relaxed bg-slate-950 p-2.5 rounded border border-slate-850">
                      "{selectedComplaint.priority_reasoning}"
                    </p>
                  </div>
                )}
              </div>

              {/* Status Timeline */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Resolution History & Progress</h3>
                <div className="relative border-l border-slate-800 pl-6 ml-3 space-y-6">
                  
                  {/* Step 1: Ingestion */}
                  <div className="relative">
                    <div className="absolute -left-[30px] top-0 bg-emerald-500/20 text-emerald-400 p-1 rounded-full border border-emerald-500/50">
                      <CheckCircle2 className="h-3 w-3" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-200">Complaint Logged</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Logged on {new Date(selectedComplaint.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Step 2: AI Pipeline */}
                  <div className="relative">
                    <div className="absolute -left-[30px] top-0 bg-emerald-500/20 text-emerald-400 p-1 rounded-full border border-emerald-500/50">
                      <CheckCircle2 className="h-3 w-3" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-200">AI Analyzed & Sorted</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Assigned to <span className="text-brand-400">{selectedComplaint.department || 'Public Works'}</span> department
                      </p>
                    </div>
                  </div>

                  {/* Step 3: Assigned */}
                  <div className="relative">
                    <div className={`absolute -left-[30px] top-0 p-1 rounded-full border ${
                      ['Assigned', 'In_Progress', 'Resolved'].includes(selectedComplaint.status)
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                        : 'bg-slate-900 text-slate-600 border-slate-800'
                    }`}>
                      {['Assigned', 'In_Progress', 'Resolved'].includes(selectedComplaint.status) ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-200">Officer Appointed</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {selectedComplaint.officer_recommendation 
                          ? `Field Officer: ${selectedComplaint.officer_recommendation}`
                          : 'Awaiting inspector assignment'
                        }
                      </p>
                    </div>
                  </div>

                  {/* Step 4: Resolved */}
                  <div className="relative font-semibold">
                    <div className={`absolute -left-[30px] top-0 p-1 rounded-full border ${
                      selectedComplaint.status === 'Resolved'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                        : 'bg-slate-900 text-slate-600 border-slate-800'
                    }`}>
                      <CheckCircle2 className="h-3 w-3" />
                    </div>
                    <div>
                      <p className={`text-xs ${selectedComplaint.status === 'Resolved' ? 'text-emerald-400' : 'text-slate-400'}`}>
                        Resolution Status
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {selectedComplaint.status === 'Resolved'
                          ? `Closed: ${selectedComplaint.officer_notes || 'Issue fixed and verified on site.'}`
                          : 'Pending site investigation'
                        }
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            <button 
              onClick={() => setSelectedComplaint(null)}
              className="w-full mt-6 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2.5 rounded-lg border border-slate-700 transition"
            >
              Close Details View
            </button>
          </div>
        </div>
      )}

      {/* AI Processing Modal (Simulator Overlay for hackathon display) */}
      {submitStatus && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full glass-panel p-8 rounded-2xl border-brand-500/20 text-center space-y-6">
            
            {submitStatus === 'uploading' && (
              <>
                <Loader2 className="h-12 w-12 text-brand-500 animate-spin mx-auto" />
                <div>
                  <h3 className="text-lg font-bold font-['Outfit']">Ingesting Complaint</h3>
                  <p className="text-xs text-slate-400 mt-1">Uploading text metadata and location coordinates...</p>
                </div>
              </>
            )}

            {submitStatus === 'classifying' && (
              <>
                <div className="h-12 w-12 flex items-center justify-center bg-brand-500/10 text-brand-400 rounded-full mx-auto relative">
                  <Loader2 className="h-12 w-12 text-brand-400 animate-spin absolute" />
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-['Outfit']">Local DistilBERT NLP Active</h3>
                  <p className="text-xs text-slate-400 mt-1">Predicting municipal category from context...</p>
                </div>
              </>
            )}

            {submitStatus === 'duplication' && (
              <>
                <div className="h-12 w-12 flex items-center justify-center bg-emerald-500/10 text-emerald-400 rounded-full mx-auto relative">
                  <Loader2 className="h-12 w-12 text-emerald-400 animate-spin absolute" />
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-['Outfit']">Sentence Transformer Scanner</h3>
                  <p className="text-xs text-slate-400 mt-1">Checking semantic all-MiniLM similarity embeddings...</p>
                </div>
              </>
            )}

            {submitStatus === 'gemini' && (
              <>
                <div className="h-12 w-12 flex items-center justify-center bg-purple-500/10 text-purple-400 rounded-full mx-auto relative">
                  <Loader2 className="h-12 w-12 text-purple-400 animate-spin absolute" />
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-['Outfit']">Gemini 2.5 Flash Inference</h3>
                  <p className="text-xs text-slate-400 mt-1">Estimating severity, resolution ETA, and routing parameters...</p>
                </div>
              </>
            )}

            {submitStatus === 'success' && (
              <div className="space-y-4">
                <div className="h-14 w-14 flex items-center justify-center bg-emerald-500 text-slate-950 rounded-full mx-auto shadow-lg shadow-emerald-500/20 animate-bounce">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold font-['Outfit'] text-emerald-400">AI Processing Complete</h3>
                  <p className="text-xs text-slate-400 mt-1">Your complaint is registered and analyzed.</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-left text-xs space-y-2 text-slate-300">
                  <p className="font-semibold text-slate-200 text-center border-b border-slate-800 pb-1.5 mb-1.5 uppercase tracking-wider text-[10px]">
                    Analysis Summary Output
                  </p>
                  <p><strong>Predicted Category:</strong> {aiPrediction?.category}</p>
                  <p><strong>Computed Priority:</strong> {aiPrediction?.priority}</p>
                  <p><strong>Assigned Department:</strong> {aiPrediction?.department || 'Public Works'}</p>
                  <p><strong>Predicted Resolution ETA:</strong> {aiPrediction?.resolution_time || '24 Hours'}</p>
                  {aiPrediction?.priority_reasoning && (
                    <p className="text-slate-400 italic text-[11px] mt-1 line-clamp-2">
                      Reasoning: "{aiPrediction?.priority_reasoning}"
                    </p>
                  )}
                </div>

                <button 
                  onClick={resetForm}
                  className="w-full bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 text-xs font-bold py-2.5 rounded-lg transition"
                >
                  Return to Portal Dashboard
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

// Helpers for styled badge colors
function getCategoryBadgeColor(cat) {
  switch (cat) {
    case 'Sanitation': return 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400';
    case 'Water Supply': return 'bg-blue-500/10 border border-blue-500/20 text-blue-400';
    case 'Roads/Potholes': return 'bg-amber-500/10 border border-amber-500/20 text-amber-400';
    case 'Electricity': return 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400';
    case 'Public Health': return 'bg-purple-500/10 border border-purple-500/20 text-purple-400';
    case 'Waste Management': return 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400';
    default: return 'bg-slate-500/10 border border-slate-500/20 text-slate-400';
  }
}

function getPriorityBadgeColor(prio) {
  switch (prio) {
    case 'Critical': return 'bg-red-500/15 border border-red-500/30 text-red-400 animate-pulse';
    case 'High': return 'bg-orange-500/10 border border-orange-500/20 text-orange-400';
    case 'Medium': return 'bg-brand-500/10 border border-brand-500/20 text-brand-400';
    default: return 'bg-slate-500/10 border border-slate-500/20 text-slate-400';
  }
}

function getStatusBadgeColor(status) {
  switch (status) {
    case 'Pending': return 'bg-slate-900 border border-slate-800 text-slate-400';
    case 'Assigned': return 'bg-blue-500/10 border border-blue-500/20 text-blue-400';
    case 'In_Progress': return 'bg-amber-500/10 border border-amber-500/20 text-amber-400';
    case 'Resolved': return 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400';
    default: return 'bg-slate-500/10 border border-slate-500/20 text-slate-400';
  }
}

// Client-side simulation values if python backend isn't responding yet
function simulateAISubmit(desc, country, state, district, city, locality, pincode, formattedAddress, pin) {
  const categories = ['Sanitation', 'Water Supply', 'Roads/Potholes', 'Electricity', 'Public Health', 'Waste Management'];
  let inferredCat = 'Public Works';
  let inferredPrio = 'Medium';
  let reasoning = 'Standard issue, routed based on average response metrics.';
  let eta = '36 Hours';
  let dept = 'Public Works Department';
  let officer = 'Officer P. Kumar';

  const descLower = desc.toLowerCase();
  
  if (descLower.includes('water') || descLower.includes('leak') || descLower.includes('drain')) {
    inferredCat = 'Water Supply';
    dept = 'Water Supply & Sewerage Board';
    officer = 'K. Ramesh (Water Inspector)';
    inferredPrio = 'High';
    eta = '24 Hours';
  } else if (descLower.includes('pothole') || descLower.includes('road') || descLower.includes('street')) {
    inferredCat = 'Roads/Potholes';
    dept = 'Public Works Department';
    officer = 'S. Murthy (PWD Inspector)';
    inferredPrio = 'Medium';
    eta = '48 Hours';
  } else if (descLower.includes('sewage') || descLower.includes('garbage') || descLower.includes('smell') || descLower.includes('stink')) {
    inferredCat = 'Sanitation';
    dept = 'Health and Sanitation Commission';
    officer = 'Dr. A. Sharma (Chief Sanitation Officer)';
    inferredPrio = 'Critical';
    reasoning = 'Presents direct community disease risks and immediate public health hazard.';
    eta = '12 Hours';
  } else if (descLower.includes('light') || descLower.includes('dark') || descLower.includes('wire') || descLower.includes('electricity')) {
    inferredCat = 'Electricity';
    dept = 'Electricity Distribution Board';
    officer = 'V. Prasad (Lineman Overseer)';
    inferredPrio = 'High';
    eta = '18 Hours';
  }

  return {
    id: 'sim-' + Math.random().toString(36).substr(2, 9),
    description: desc,
    country,
    state,
    district,
    city,
    locality,
    pincode,
    formatted_address: formattedAddress,
    pipeline_stage: "Officer_Review",
    latitude: pin ? pin[0] : 12.9716,
    longitude: pin ? pin[1] : 77.5946,
    category: inferredCat,
    priority: inferredPrio,
    department: dept,
    resolution_time: eta,
    priority_reasoning: reasoning,
    officer_recommendation: officer,
    status: 'Pending',
    created_at: new Date().toISOString()
  };
}

function getDemoCitizenComplaints() {
  return [];
}
