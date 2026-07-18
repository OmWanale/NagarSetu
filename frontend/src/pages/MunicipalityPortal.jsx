import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  ShieldCheck,
  TrendingUp,
  AlertOctagon,
  CheckCircle,
  Copy,
  Users,
  Search,
  Filter,
  Download,
  AlertTriangle,
  BrainCircuit,
  Maximize2,
  RefreshCw,
  FolderOpen,
  Map as MapIcon,
  ListFilter,
  BarChart3,
  Briefcase,
  ChevronRight,
  Clock,
  Settings,
  Calendar,
  Layers,
  ArrowRight,
  Activity,
  Play,
  FileText,
  Sun,
  Moon
} from 'lucide-react';

export default function MunicipalityPortal() {
  const { user, token, logout, apiUrl, theme, toggleTheme } = useAuth();
  const navigate = useNavigate();

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Sidebar Tabs State
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, intake, ai_queue, management, map, analytics, departments, recommendations, reports, settings

  // Database States
  const [complaints, setComplaints] = useState([]);
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [advancedStats, setAdvancedStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  // Search & Multi-Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stateFilter, setStateFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Map settings
  const defaultCenter = [19.0760, 72.8777]; // Centered near Mumbai
  const [mapZoom, setMapZoom] = useState(5); // Nationwide scale by default
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showCluster, setShowCluster] = useState(true);

  // Load complaints and duplicate groups
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // 1. Fetch complaints
      const compRes = await fetch(`${apiUrl}/api/complaints`, { headers });
      let complaintsData = [];
      if (compRes.ok) {
        complaintsData = await compRes.json();
      } else {
        complaintsData = getDemoMunicipalityComplaints();
      }

      // 2. Fetch duplicate groups
      const dupRes = await fetch(`${apiUrl}/api/complaints/duplicates`, { headers });
      let duplicatesData = [];
      if (dupRes.ok) {
        duplicatesData = await dupRes.json();
      } else {
        duplicatesData = getDemoDuplicateGroups();
      }

      // 3. Fetch advanced statistics
      const statsRes = await fetch(`${apiUrl}/api/analytics/advanced`, { headers });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setAdvancedStats(statsData);
      } else {
        setAdvancedStats(computeClientStats(complaintsData));
      }

      setComplaints(complaintsData);
      setDuplicateGroups(duplicatesData);
    } catch (e) {
      console.warn("Backend API offline. Using fallback municipal data.", e);
      const fallbackComplaints = getDemoMunicipalityComplaints();
      setComplaints(fallbackComplaints);
      setDuplicateGroups(getDemoDuplicateGroups());
      setAdvancedStats(computeClientStats(fallbackComplaints));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Update complaint status & notes
  const handleUpdateStatus = async (id, nextStatus) => {
    const notes = prompt("Enter resolution notes / comments:", "");
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Map status updates to relevant pipeline stages
      let stage = "Officer_Review";
      if (nextStatus === "In_Progress") stage = "In_Progress";
      else if (nextStatus === "Resolved") stage = "Resolved";

      const response = await fetch(`${apiUrl}/api/officers/complaints/${id}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: nextStatus, notes: notes || "Updated by operations center" })
      });

      if (response.ok) {
        // Fetch fresh copy to update stages
        loadData(true);
        if (selectedComplaint && selectedComplaint.id === id) {
          setSelectedComplaint(prev => ({ 
            ...prev, 
            status: nextStatus, 
            pipeline_stage: stage,
            officer_notes: notes || prev.officer_notes 
          }));
        }
      } else {
        throw new Error("Failed update");
      }
    } catch (err) {
      console.warn("Simulating update locally.", err);
      let stage = "Officer_Review";
      if (nextStatus === "In_Progress") stage = "In_Progress";
      else if (nextStatus === "Resolved") stage = "Resolved";

      setComplaints(prev => prev.map(c => 
        c.id === id ? { ...c, status: nextStatus, pipeline_stage: stage, officer_notes: notes || "Updated on-site by officer" } : c
      ));
      if (selectedComplaint && selectedComplaint.id === id) {
        setSelectedComplaint(prev => ({ 
          ...prev, 
          status: nextStatus, 
          pipeline_stage: stage,
          officer_notes: notes || "Updated on-site by officer" 
        }));
      }
    }
  };

  // Merge duplicates
  const handleMergeDuplicates = async (groupId) => {
    if (!confirm("Are you sure you want to merge this duplicate group? Secondary complaints will be auto-resolved.")) return;
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${apiUrl}/api/officers/duplicates/${groupId}/merge`, {
        method: 'POST',
        headers
      });

      if (response.ok) {
        loadData(true);
      } else {
        throw new Error("Merge failed");
      }
    } catch (err) {
      console.warn("Simulating duplicate merge locally.", err);
      const groupToMerge = duplicateGroups.find(g => g.id === groupId);
      if (groupToMerge) {
        const secondaryIds = groupToMerge.secondary_complaints.map(c => c.id);
        setComplaints(prev => prev.map(c => 
          secondaryIds.includes(c.id) 
            ? { ...c, status: 'Resolved', pipeline_stage: 'Resolved', officer_notes: `Merged as duplicate of primary incident ID: ${groupToMerge.primary_complaint.id}` } 
            : c
        ));
        setDuplicateGroups(prev => prev.filter(g => g.id !== groupId));
      }
    }
  };

  // CSV Exporter
  const downloadCSVReport = () => {
    const csvRows = [];
    const headers = ['ID', 'Citizen Name', 'Description', 'Category', 'Priority', 'State', 'District', 'City', 'Locality', 'Pincode', 'Address', 'Status', 'Stage', 'Resolution ETA', 'Submission Date'];
    csvRows.push(headers.join(','));

    filteredComplaints.forEach(c => {
      const row = [
        c.id,
        c.citizen_name || 'Anonymous',
        `"${c.description.replace(/"/g, '""')}"`,
        c.category,
        c.priority,
        c.state,
        c.district,
        c.city,
        c.locality,
        c.pincode || '',
        `"${(c.formatted_address || '').replace(/"/g, '""')}"`,
        c.status,
        c.pipeline_stage,
        c.resolution_time || 'N/A',
        new Date(c.created_at).toLocaleDateString()
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `NagarSetu_IndianCities_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Run searches and filters
  const filteredComplaints = complaints.filter(c => {
    const matchesSearch = c.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (c.citizen_name && c.citizen_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (c.locality && c.locality.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (c.city && c.city.toLowerCase().includes(searchTerm.toLowerCase()));
                          
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || c.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'ALL' || c.category === categoryFilter;
    const matchesState = stateFilter === 'ALL' || c.state === stateFilter;
    const matchesCity = cityFilter === 'ALL' || c.city === cityFilter;
    const matchesDept = departmentFilter === 'ALL' || c.department === departmentFilter;

    let matchesDates = true;
    if (startDateFilter) {
      matchesDates = matchesDates && new Date(c.created_at) >= new Date(startDateFilter);
    }
    if (endDateFilter) {
      // Add one day to include the entire end date
      const endD = new Date(endDateFilter);
      endD.setDate(endD.getDate() + 1);
      matchesDates = matchesDates && new Date(c.created_at) <= endD;
    }

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesState && matchesCity && matchesDept && matchesDates;
  });

  // Calculate distinct items for filter selectors
  const uniqueStates = [...new Set(complaints.map(c => c.state))];
  const uniqueCities = [...new Set(complaints.map(c => c.city))];
  const uniqueDepts = [...new Set(complaints.map(c => c.department).filter(Boolean))];

  // Dynamic Map Markers Clustering Helper
  // Groups complaints that are extremely close to each other
  const getClusteredMarkers = () => {
    const clusters = [];
    const thresholdDist = 0.05; // Degree difference mapping

    filteredComplaints.forEach(comp => {
      let addedToCluster = false;
      for (let c of clusters) {
        const dLat = Math.abs(c.lat - comp.latitude);
        const dLng = Math.abs(c.lng - comp.longitude);
        if (dLat < thresholdDist && dLng < thresholdDist) {
          c.items.push(comp);
          addedToCluster = true;
          break;
        }
      }
      if (!addedToCluster) {
        clusters.push({
          lat: comp.latitude,
          lng: comp.longitude,
          items: [comp]
        });
      }
    });

    return clusters;
  };

  const chartThemeColors = ['#6393f2', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header Bar */}
      <nav className="w-full bg-slate-900/60 border-b border-slate-800 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="bg-brand-500 text-slate-950 p-1.5 rounded-md font-bold">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="font-extrabold text-xl font-['Outfit']">NagarSetu</span>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 font-semibold uppercase tracking-wider">
              AI Command Operations
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="text-slate-400 hover:text-white p-2 rounded-lg bg-slate-900 border border-slate-800/80 transition-all flex items-center justify-center shrink-0"
              title={theme === 'dark' ? "Toggle Light Mode" : "Toggle Dark Mode"}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-400" />}
            </button>

            <button 
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="text-slate-400 hover:text-white p-2 rounded-lg bg-slate-900 border border-slate-800/80 transition"
              title="Refresh Data"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <div className="text-sm text-slate-300 font-medium">
              {user?.full_name}
            </div>
            <button 
              onClick={() => { logout(); navigate('/'); }}
              className="text-xs font-semibold px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Sidebar Wrapper */}
      <div className="flex flex-grow w-full max-w-7xl mx-auto px-6 py-6 gap-6 min-h-0">
        
        {/* Sidebar Panel (w-64) */}
        <aside className="w-64 bg-slate-900/40 border border-slate-900/80 rounded-2xl p-4 shrink-0 flex flex-col justify-between">
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase px-3.5 mb-2">NAVIGATION</p>
            
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'dashboard' ? 'bg-brand-500 text-slate-950 shadow shadow-brand-500/25' : 'text-slate-400 hover:bg-slate-900/50 hover:text-white'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Overview Dashboard
            </button>

            <button
              onClick={() => setActiveTab('intake')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'intake' ? 'bg-brand-500 text-slate-950 shadow shadow-brand-500/25' : 'text-slate-400 hover:bg-slate-900/50 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4" />
                Complaint Intake
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'intake' ? 'bg-slate-950 text-brand-400' : 'bg-slate-900 text-slate-400'}`}>
                {complaints.filter(c => c.pipeline_stage === 'Officer_Review' || c.status === 'Pending').length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ai_queue')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'ai_queue' ? 'bg-brand-500 text-slate-950 shadow shadow-brand-500/25' : 'text-slate-400 hover:bg-slate-900/50 hover:text-white'
              }`}
            >
              <BrainCircuit className="h-4 w-4" />
              AI Analysis Queue
            </button>

            <button
              onClick={() => setActiveTab('management')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'management' ? 'bg-brand-500 text-slate-950 shadow shadow-brand-500/25' : 'text-slate-400 hover:bg-slate-900/50 hover:text-white'
              }`}
            >
              <Briefcase className="h-4 w-4" />
              Complaint Management
            </button>

            <button
              onClick={() => setActiveTab('map')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'map' ? 'bg-brand-500 text-slate-950 shadow shadow-brand-500/25' : 'text-slate-400 hover:bg-slate-900/50 hover:text-white'
              }`}
            >
              <MapIcon className="h-4 w-4" />
              GIS Map & Heatmap
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'analytics' ? 'bg-brand-500 text-slate-950 shadow shadow-brand-500/25' : 'text-slate-400 hover:bg-slate-900/50 hover:text-white'
              }`}
            >
              <Activity className="h-4 w-4" />
              Advanced Analytics
            </button>

            <button
              onClick={() => setActiveTab('departments')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'departments' ? 'bg-brand-500 text-slate-950 shadow shadow-brand-500/25' : 'text-slate-400 hover:bg-slate-900/50 hover:text-white'
              }`}
            >
              <Layers className="h-4 w-4" />
              Departments Workload
            </button>

            <button
              onClick={() => setActiveTab('recommendations')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'recommendations' ? 'bg-brand-500 text-slate-950 shadow shadow-brand-500/25' : 'text-slate-400 hover:bg-slate-900/50 hover:text-white'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
              AI Recommendations
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'reports' ? 'bg-brand-500 text-slate-950 shadow shadow-brand-500/25' : 'text-slate-400 hover:bg-slate-900/50 hover:text-white'
              }`}
            >
              <Download className="h-4 w-4" />
              Export Reports
            </button>
          </div>

          <div className="border-t border-slate-800/80 pt-4">
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'settings' ? 'bg-brand-500 text-slate-950 shadow shadow-brand-500/25' : 'text-slate-400 hover:bg-slate-900/50 hover:text-white'
              }`}
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
          </div>
        </aside>

        {/* Content Box (Flex-1) */}
        <main className="flex-1 overflow-y-auto pr-1 min-w-0">
          
          {loading ? (
            <div className="h-full flex items-center justify-center flex-col py-36 bg-slate-900/20 border border-slate-900 rounded-2xl">
              <LoaderIcon className="h-10 w-10 text-brand-500 animate-spin mb-4" />
              <p className="text-sm font-semibold text-slate-300">Synchronizing Municipal Databases...</p>
              <p className="text-xs text-slate-500 mt-1">Downloading AI predictions and localized Indian coordinates...</p>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              
              {/* Tab 1: Dashboard Overview */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="glass-panel p-5 rounded-2xl relative overflow-hidden">
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Complaints</p>
                      <p className="text-3xl font-extrabold mt-2 text-white">{complaints.length}</p>
                      <span className="absolute bottom-2 right-2 text-slate-700"><FolderOpen className="h-8 w-8 opacity-20" /></span>
                    </div>
                    <div className="glass-panel p-5 rounded-2xl relative overflow-hidden border-red-500/10">
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider text-red-400">Critical Alerts</p>
                      <p className="text-3xl font-extrabold mt-2 text-red-500">
                        {complaints.filter(c => c.priority === 'Critical').length}
                      </p>
                      <span className="absolute bottom-2 right-2 text-red-950"><AlertOctagon className="h-8 w-8 opacity-20" /></span>
                    </div>
                    <div className="glass-panel p-5 rounded-2xl relative overflow-hidden border-amber-500/10">
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider text-amber-400">Pending Actions</p>
                      <p className="text-3xl font-extrabold mt-2 text-amber-400">
                        {complaints.filter(c => c.status !== 'Resolved').length}
                      </p>
                      <span className="absolute bottom-2 right-2 text-amber-950"><TrendingUp className="h-8 w-8 opacity-20" /></span>
                    </div>
                    <div className="glass-panel p-5 rounded-2xl relative overflow-hidden border-emerald-500/10">
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider text-emerald-400">Resolved Cases</p>
                      <p className="text-3xl font-extrabold mt-2 text-emerald-400">
                        {complaints.filter(c => c.status === 'Resolved').length}
                      </p>
                      <span className="absolute bottom-2 right-2 text-emerald-950"><CheckCircle className="h-8 w-8 opacity-20" /></span>
                    </div>
                    <div className="glass-panel p-5 rounded-2xl relative overflow-hidden border-brand-500/10 col-span-2 md:col-span-1">
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider text-brand-400">Duplicates Filtered</p>
                      <p className="text-3xl font-extrabold mt-2 text-brand-400">
                        +{advancedStats?.prevented_duplicates || 3} Prev.
                      </p>
                    </div>
                  </div>

                  {/* Quick Alert Banner */}
                  <div className="bg-brand-950/20 border border-brand-500/20 p-4 rounded-xl flex gap-3 text-xs leading-relaxed text-brand-400 items-start">
                    <BrainCircuit className="h-5 w-5 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <p className="font-bold text-white uppercase tracking-wider text-[9px] mb-1">AI Daily Operational Brief</p>
                      <p>
                        Current city resolution rate stands at <strong>{advancedStats?.resolution_rate}%</strong> with an average resolution duration of <strong>{advancedStats?.avg_resolution_hours} hours</strong>. 
                        Mosquito vector spikes reported in Whitefield, Bengaluru and sanitation manhole blockages flagged Critical in Bandra, Mumbai. Workloads are elevated for the Health and Sanitation Commission.
                      </p>
                    </div>
                  </div>

                  {/* Primary charts row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="glass-panel p-5 rounded-2xl h-80 flex flex-col justify-between">
                      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Complaint Categories</h2>
                      <div className="flex-grow h-48 mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsBarChart data={advancedStats?.categories || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
                            <YAxis stroke="#64748b" fontSize={9} />
                            <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }} />
                            <Bar dataKey="value" fill="#6393f2" radius={[4, 4, 0, 0]}>
                              {(advancedStats?.categories || []).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={chartThemeColors[index % chartThemeColors.length]} />
                              ))}
                            </Bar>
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="glass-panel p-5 rounded-2xl h-80 flex flex-col justify-between">
                      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Daily Ingestion Trends</h2>
                      <div className="flex-grow h-52 mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={advancedStats?.daily_trends || []}>
                            <defs>
                              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6393f2" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#6393f2" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="date" stroke="#64748b" fontSize={9} />
                            <YAxis stroke="#64748b" fontSize={9} />
                            <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }} />
                            <Area type="monotone" dataKey="value" stroke="#6393f2" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Hotspots Overview */}
                  <div className="glass-panel p-6 rounded-2xl">
                    <h2 className="text-sm font-bold font-['Outfit'] mb-4">Critical Local Hotspots (Top 5 Areas)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      {(advancedStats?.top_localities || []).slice(0, 5).map((loc, idx) => (
                        <div key={loc.name} className="p-4 bg-slate-950 border border-slate-900 rounded-xl relative overflow-hidden">
                          <span className="text-[10px] text-slate-500 block font-semibold uppercase">Rank #{idx+1}</span>
                          <span className="text-sm font-extrabold text-slate-200 mt-1 block truncate" title={loc.name}>
                            {loc.name.split(' (')[0]}
                          </span>
                          <span className="text-xs text-slate-400 block mt-0.5">{loc.name.match(/\(([^)]+)\)/)?.[1] || 'India'}</span>
                          <span className="text-2xl font-black mt-2 block text-brand-400">{loc.value} Incidents</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Complaint Intake Queue */}
              {activeTab === 'intake' && (
                <div className="glass-panel p-6 rounded-2xl space-y-6">
                  <div>
                    <h2 className="text-lg font-bold font-['Outfit']">Intake & Verification Pipeline</h2>
                    <p className="text-xs text-slate-400 mt-1">Showing newly ingested complaints and their verification state in the AI pipeline.</p>
                  </div>

                  <div className="space-y-4">
                    {complaints.filter(c => c.status === 'Pending' || c.pipeline_stage === 'Officer_Review').slice(0, 8).map((comp) => (
                      <div key={comp.id} className="p-5 bg-slate-950 border border-slate-900 rounded-xl space-y-4">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <span className="text-[10px] font-mono text-slate-500 font-bold block">ID: {comp.id}</span>
                            <span className="text-sm text-slate-200 font-medium mt-1 block">"{comp.description}"</span>
                            <span className="text-[10px] text-brand-400 block mt-1.5 font-semibold">
                              Filed by {comp.citizen_name || 'Rahul Sharma'} • {comp.locality}, {comp.city}, {comp.state}
                            </span>
                          </div>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${getCategoryBadgeColor(comp.category)}`}>
                            {comp.category}
                          </span>
                        </div>

                        {/* Pipeline Stage Visualizer */}
                        <div className="border-t border-slate-900 pt-3">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">AI Verification Progress</p>
                          <div className="grid grid-cols-5 gap-2 text-center text-[9px] font-semibold text-slate-400">
                            <div className="p-1.5 rounded bg-emerald-950/20 border border-emerald-500/20 text-emerald-400">1. Intake</div>
                            <div className="p-1.5 rounded bg-emerald-950/20 border border-emerald-500/20 text-emerald-400">2. NLP Categorized</div>
                            <div className="p-1.5 rounded bg-emerald-950/20 border border-emerald-500/20 text-emerald-400">3. Priority Scored</div>
                            <div className="p-1.5 rounded bg-emerald-950/20 border border-emerald-500/20 text-emerald-400">4. Dept Routed</div>
                            <div className="p-1.5 rounded bg-brand-500 text-slate-950 shadow shadow-brand-500/20 font-bold">5. Officer Review</div>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            onClick={() => { setSelectedComplaint(comp); }}
                            className="bg-slate-900 border border-slate-800 text-[10px] font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-850 transition"
                          >
                            Analyze Pipeline Outputs
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(comp.id, 'In_Progress')}
                            className="bg-brand-600 hover:bg-brand-500 text-slate-950 text-[10px] font-bold px-3 py-1.5 rounded-lg transition"
                          >
                            Approve & Dispatch
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 3: AI Analysis Queue */}
              {activeTab === 'ai_queue' && (
                <div className="glass-panel p-6 rounded-2xl space-y-6">
                  <div>
                    <h2 className="text-lg font-bold font-['Outfit'] flex items-center gap-2">
                      <BrainCircuit className="h-5 w-5 text-purple-400" />
                      AI Analysis & Decision Logs
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Reviewing semantic metadata, predicted resolution times, and LLM reasoning logs.</p>
                  </div>

                  <div className="space-y-4">
                    {complaints.slice(0, 10).map((comp) => (
                      <div key={comp.id} className="p-5 bg-slate-950 border border-slate-900 rounded-xl grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-7 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${getCategoryBadgeColor(comp.category)}`}>
                              {comp.category}
                            </span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${getPriorityBadgeColor(comp.priority)}`}>
                              {comp.priority}
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold">{comp.locality}, {comp.city}</span>
                          </div>

                          <p className="text-sm font-semibold text-slate-200">"{comp.description}"</p>
                          <p className="text-xs text-slate-400 bg-slate-900/60 p-3 rounded-lg border border-slate-900 italic">
                            "<strong>AI Reasoning:</strong> {comp.priority_reasoning || 'Heuristic priority routing assigned based on category and proximity parameters.'}"
                          </p>
                        </div>

                        <div className="md:col-span-5 border-l border-slate-900 pl-4 flex flex-col justify-between text-xs space-y-2">
                          <div>
                            <span className="text-slate-500 block uppercase text-[9px] font-bold tracking-wider">Classification Summary</span>
                            <div className="mt-1.5 space-y-1 text-slate-300">
                              <p>Routed Dept: <strong className="text-slate-100">{comp.department || 'Public Works'}</strong></p>
                              <p>Predicted ETA: <strong className="text-slate-100">{comp.resolution_time || '24 Hours'}</strong></p>
                              <p>Rec. Officer: <strong className="text-slate-100">{comp.officer_recommendation || 'Unassigned'}</strong></p>
                            </div>
                          </div>

                          <button
                            onClick={() => setSelectedComplaint(comp)}
                            className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold py-2 rounded-lg transition"
                          >
                            Explore Detailed Context
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 4: Complaint Management */}
              {activeTab === 'management' && (
                <div className="glass-panel p-6 rounded-2xl space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                      <h2 className="text-lg font-bold font-['Outfit']">Incident Action Center</h2>
                      <p className="text-xs text-slate-400 mt-1">Review active issues, allocate personnel, and clear duplicates from the database.</p>
                    </div>

                    <span className="text-xs text-slate-400 bg-slate-950 border border-slate-900 px-3 py-1.5 rounded-full font-bold">
                      {complaints.filter(c => c.status !== 'Resolved').length} Active Incidents
                    </span>
                  </div>

                  {/* Group Duplicates Merger */}
                  {duplicateGroups.length > 0 && (
                    <div className="p-4 bg-emerald-950/10 border border-emerald-500/20 rounded-xl space-y-4">
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                        <BrainCircuit className="h-4.5 w-4.5 animate-pulse" />
                        AI Duplicate Groups Flagged ({duplicateGroups.length})
                      </div>

                      <div className="space-y-3">
                        {duplicateGroups.map((group) => (
                          <div key={group.id} className="p-3.5 bg-slate-950 border border-slate-900 rounded-lg flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="text-xs space-y-1">
                              <p className="font-semibold text-slate-200">
                                Primary Complaint: <span className="text-brand-400">"{group.primary_complaint.description}"</span>
                              </p>
                              <p className="text-slate-400">
                                Found <strong className="text-emerald-400">{group.secondary_complaints.length}</strong> matching reports (Similarity score: {(group.similarity_score * 100).toFixed(1)}%)
                              </p>
                            </div>

                            <button
                              onClick={() => handleMergeDuplicates(group.id)}
                              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-bold px-3 py-2 rounded-lg shrink-0 transition"
                            >
                              Merge & Auto-Resolve
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Small Action List */}
                  <div className="space-y-3">
                    {complaints.filter(c => c.status !== 'Resolved').slice(0, 10).map((comp) => (
                      <div key={comp.id} className="p-4 bg-slate-950 border border-slate-900 rounded-xl flex items-center justify-between gap-4 text-xs">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-500">#{comp.id.substring(0, 8)}</span>
                            <span className={`text-[9px] font-bold px-2 rounded-full ${getPriorityBadgeColor(comp.priority)}`}>
                              {comp.priority}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold">{comp.locality}, {comp.city}</span>
                          </div>
                          <p className="text-slate-200 truncate">"{comp.description}"</p>
                          <p className="text-[10px] text-slate-500">Department: {comp.department} • Recommended: {comp.officer_recommendation}</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            value={comp.status}
                            onChange={(e) => handleUpdateStatus(comp.id, e.target.value)}
                            className="bg-slate-900 border border-slate-800 text-[10px] px-2 py-1.5 rounded-lg text-slate-300 focus:outline-none"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Assigned">Assigned</option>
                            <option value="In_Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                          </select>

                          <button
                            onClick={() => setSelectedComplaint(comp)}
                            className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-2 rounded-lg"
                          >
                            <Maximize2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 5: GIS Map & Heatmap page */}
              {activeTab === 'map' && (
                <div className="glass-panel p-5 rounded-2xl h-[550px] flex flex-col justify-between">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <h2 className="text-sm font-bold font-['Outfit'] flex items-center gap-2">
                      <MapIcon className="h-4.5 w-4.5 text-brand-400" />
                      GIS Incident Map Control Center
                    </h2>

                    {/* GIS Toggles */}
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showHeatmap}
                          onChange={(e) => setShowHeatmap(e.target.checked)}
                          className="rounded border-slate-800 text-brand-500 focus:ring-0 bg-slate-950 h-4 w-4"
                        />
                        Heatmap Layer
                      </label>
                      <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showCluster}
                          onChange={(e) => setShowCluster(e.target.checked)}
                          className="rounded border-slate-800 text-brand-500 focus:ring-0 bg-slate-950 h-4 w-4"
                        />
                        Cluster Grouping
                      </label>

                      {/* Map Focus Zoom Dropdowns */}
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'ALL') {
                            setMapZoom(5);
                          } else {
                            // Focus zoom coordinates for specific cities
                            setMapZoom(12);
                          }
                        }}
                        className="bg-slate-950 border border-slate-800 px-2 py-1 rounded text-[10px]"
                      >
                        <option value="ALL">Nationwide Scale</option>
                        <option value="Mumbai">Mumbai Focus</option>
                        <option value="Bengaluru">Bengaluru Focus</option>
                        <option value="Delhi">Delhi Focus</option>
                        <option value="Chennai">Chennai Focus</option>
                        <option value="Hyderabad">Hyderabad Focus</option>
                      </select>
                    </div>
                  </div>

                  {/* Active filters bar for Map */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-[10px]">
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="bg-slate-950 border border-slate-850 rounded px-2 py-1.5 text-slate-300"
                    >
                      <option value="ALL">All Categories</option>
                      <option value="Sanitation">Sanitation</option>
                      <option value="Water Supply">Water Supply</option>
                      <option value="Roads/Potholes">Roads/Potholes</option>
                      <option value="Electricity">Electricity</option>
                      <option value="Public Health">Public Health</option>
                      <option value="Waste Management">Waste Management</option>
                    </select>

                    <select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                      className="bg-slate-950 border border-slate-850 rounded px-2 py-1.5 text-slate-300"
                    >
                      <option value="ALL">All Priorities</option>
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-slate-950 border border-slate-850 rounded px-2 py-1.5 text-slate-300"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="Pending">Pending</option>
                      <option value="Assigned">Assigned</option>
                      <option value="In_Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>

                    <select
                      value={cityFilter}
                      onChange={(e) => setCityFilter(e.target.value)}
                      className="bg-slate-950 border border-slate-850 rounded px-2 py-1.5 text-slate-300"
                    >
                      <option value="ALL">All Cities</option>
                      {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="flex-grow rounded-xl overflow-hidden relative z-10">
                    <MapContainer 
                      center={defaultCenter} 
                      zoom={mapZoom} 
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
                      
                      {/* Render Heatmap circles if active */}
                      {showHeatmap && filteredComplaints.map((item) => (
                        <Circle
                          key={`heat-${item.id}`}
                          center={[item.latitude, item.longitude]}
                          radius={1200}
                          pathOptions={{
                            fillColor: item.priority === 'Critical' ? '#ef4444' : item.priority === 'High' ? '#f97316' : '#6393f2',
                            fillOpacity: 0.12,
                            stroke: false
                          }}
                        />
                      ))}

                      {/* Render Cluster markers or individual markers */}
                      {showCluster ? (
                        getClusteredMarkers().map((cluster, cidx) => {
                          const count = cluster.items.length;
                          const primaryItem = cluster.items[0];
                          
                          if (count === 1) {
                            let mColor = 'cyan';
                            if (primaryItem.priority === 'Critical') mColor = 'red';
                            else if (primaryItem.priority === 'High') mColor = 'orange';

                            const cIcon = new L.Icon({
                              iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${mColor}.png`,
                              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                              iconSize: [20, 32],
                              iconAnchor: [10, 32],
                              popupAnchor: [1, -26],
                              shadowSize: [32, 32]
                            });

                            return (
                              <Marker key={primaryItem.id} position={[primaryItem.latitude, primaryItem.longitude]} icon={cIcon}>
                                <Popup>
                                  <div className="text-left font-sans text-xs space-y-1 max-w-[180px]">
                                    <div className="font-bold text-[10px] text-brand-400 uppercase">{primaryItem.category}</div>
                                    <p className="text-slate-200 line-clamp-2">"{primaryItem.description}"</p>
                                    <span className="text-[9px] text-slate-400 block">{primaryItem.locality}, {primaryItem.city}</span>
                                    <button 
                                      onClick={() => setSelectedComplaint(primaryItem)}
                                      className="w-full mt-1 bg-brand-600 hover:bg-brand-500 text-slate-950 font-bold py-1 rounded text-[9px]"
                                    >
                                      Manage Incident
                                    </button>
                                  </div>
                                </Popup>
                              </Marker>
                            );
                          }

                          // Render a custom CSS circle as a cluster marker
                          const htmlMarkup = `<div class="flex items-center justify-center rounded-full bg-brand-500/25 border-2 border-brand-400 text-slate-100 font-extrabold text-[10px] h-7 w-7 shadow-lg shadow-brand-500/30">${count}</div>`;
                          const clusterIcon = new L.divIcon({
                            html: htmlMarkup,
                            className: 'custom-leaflet-cluster-icon',
                            iconSize: [28, 28]
                          });

                          return (
                            <Marker key={`cluster-${cidx}`} position={[cluster.lat, cluster.lng]} icon={clusterIcon}>
                              <Popup>
                                <div className="text-left font-sans text-xs space-y-1.5 max-w-[190px]">
                                  <div className="font-bold text-[10px] text-brand-400 uppercase">Locality Cluster ({count} cases)</div>
                                  <p className="text-[10px] text-slate-400">{primaryItem.locality}, {primaryItem.city}</p>
                                  <div className="border-t border-slate-800/80 pt-1 max-h-24 overflow-y-auto space-y-1">
                                    {cluster.items.map(ci => (
                                      <div key={ci.id} className="text-[9px] truncate border-b border-slate-900 pb-0.5">
                                        <span className="font-bold text-slate-300">[{ci.priority}]</span> "{ci.description}"
                                      </div>
                                    ))}
                                  </div>
                                  <button
                                    onClick={() => {
                                      setSearchTerm(primaryItem.locality);
                                      setActiveTab('reports');
                                    }}
                                    className="w-full bg-slate-900 border border-slate-800 text-[9px] py-1 text-slate-300 font-bold rounded"
                                  >
                                    View in database
                                  </button>
                                </div>
                              </Popup>
                            </Marker>
                          );
                        })
                      ) : (
                        filteredComplaints.map((item) => {
                          let markerColor = 'cyan';
                          if (item.priority === 'Critical') markerColor = 'red';
                          else if (item.priority === 'High') markerColor = 'orange';

                          const customIcon = new L.Icon({
                            iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${markerColor}.png`,
                            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                            iconSize: [22, 36],
                            iconAnchor: [11, 36],
                            popupAnchor: [1, -30],
                            shadowSize: [36, 36]
                          });

                          return (
                            <Marker key={item.id} position={[item.latitude, item.longitude]} icon={customIcon}>
                              <Popup>
                                <div className="text-left font-sans text-xs space-y-1 max-w-[180px]">
                                  <div className="font-bold text-[10px] text-brand-400 uppercase">{item.category}</div>
                                  <p className="text-slate-200 line-clamp-2">"{item.description}"</p>
                                  <span className="text-[9px] text-slate-400 block">{item.locality}, {item.city}</span>
                                  <button 
                                    onClick={() => setSelectedComplaint(item)}
                                    className="w-full mt-1 bg-brand-600 hover:bg-brand-500 text-slate-950 font-bold py-1 rounded text-[9px]"
                                  >
                                    Manage Incident
                                  </button>
                                </div>
                              </Popup>
                            </Marker>
                          );
                        })
                      )}
                    </MapContainer>
                  </div>
                </div>
              )}

              {/* Tab 6: Advanced Analytics dashboard */}
              {activeTab === 'analytics' && (
                <div className="space-y-6">
                  {/* Row 1: Charts on Regional and Hotspots */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="glass-panel p-5 rounded-2xl h-80 flex flex-col justify-between lg:col-span-2">
                      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Cities with Highest Complaints</h2>
                      <div className="flex-grow h-52 mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsBarChart data={advancedStats?.top_cities || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
                            <YAxis stroke="#64748b" fontSize={9} />
                            <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }} />
                            <Bar dataKey="value" fill="#6393f2" radius={[4, 4, 0, 0]}>
                              {(advancedStats?.top_cities || []).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={chartThemeColors[index % chartThemeColors.length]} />
                              ))}
                            </Bar>
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="glass-panel p-5 rounded-2xl h-80 flex flex-col justify-between">
                      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resolution Rate & Speeds</h2>
                      <div className="flex-grow flex flex-col items-center justify-center space-y-4">
                        <div className="text-center">
                          <span className="text-[10px] text-slate-400 block font-semibold uppercase">Resolved Rate</span>
                          <span className="text-4xl font-black text-emerald-400">{advancedStats?.resolution_rate}%</span>
                        </div>
                        <div className="w-full border-t border-slate-900 pt-3 text-center">
                          <span className="text-[10px] text-slate-400 block font-semibold uppercase">Average Resolution ETA</span>
                          <span className="text-3xl font-black text-slate-200 mt-1 block">
                            {advancedStats?.avg_resolution_hours} Hours
                          </span>
                          <p className="text-[9px] text-slate-500 mt-1">Calculated from site clearance closures.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Ingestion distribution peak hours */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="glass-panel p-5 rounded-2xl h-80 flex flex-col justify-between">
                      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Peak Complaint Hours (0-23 Ingestion)</h2>
                      <div className="flex-grow h-52 mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={advancedStats?.hourly_distribution || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="hour" stroke="#64748b" fontSize={8} interval={2} />
                            <YAxis stroke="#64748b" fontSize={9} />
                            <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }} />
                            <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 2.5 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="glass-panel p-5 rounded-2xl h-80 flex flex-col justify-between">
                      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Classifier Accuracy Trends</h2>
                      <div className="flex-grow h-52 mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsBarChart data={advancedStats?.ai_predictions || []} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis type="number" stroke="#64748b" fontSize={9} domain={[80, 100]} />
                            <YAxis type="category" dataKey="category" stroke="#64748b" fontSize={9} width={90} />
                            <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }} />
                            <Bar dataKey="accuracy" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Regional state maps distributions */}
                  <div className="glass-panel p-6 rounded-2xl">
                    <h2 className="text-sm font-bold font-['Outfit'] mb-4">Complaints by Indian State</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
                      {(advancedStats?.states || []).map(st => (
                        <div key={st.name} className="p-3 bg-slate-950 border border-slate-900 rounded-xl">
                          <span className="text-xs text-slate-400 block font-semibold">{st.name}</span>
                          <span className="text-2xl font-extrabold mt-1 block text-brand-400">{st.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 7: Departments Queue */}
              {activeTab === 'departments' && (
                <div className="glass-panel p-6 rounded-2xl space-y-6">
                  <div>
                    <h2 className="text-lg font-bold font-['Outfit']">Department Backlog & Workload</h2>
                    <p className="text-xs text-slate-400 mt-1">Monitoring active case backlogs allocated to each municipal board.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Backlog stats */}
                    <div className="md:col-span-2 p-5 bg-slate-950 border border-slate-900 rounded-xl h-80 flex flex-col justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Active Backlogs</span>
                      <div className="flex-grow h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsBarChart data={advancedStats?.departments || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
                            <YAxis stroke="#64748b" fontSize={9} />
                            <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }} />
                            <Bar dataKey="value" fill="#ec4899" radius={[4, 4, 0, 0]} />
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Department balancing analysis */}
                    <div className="p-5 bg-slate-950 border border-slate-900 rounded-xl space-y-4 text-xs">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Balancing Warnings</span>
                      
                      <div className="space-y-3.5 leading-relaxed text-slate-300">
                        <div className="border-l-2 border-red-500 pl-3">
                          <p className="font-bold text-white text-[11px]">Water Supply workload High</p>
                          <p className="text-slate-400 mt-0.5">Water Board backlog represents 35% of total active city issues. Suggest dispatching additional pipeline crews.</p>
                        </div>
                        <div className="border-l-2 border-yellow-500 pl-3">
                          <p className="font-bold text-white text-[11px]">Sanitation backlog steady</p>
                          <p className="text-slate-400 mt-0.5">Health and Sanitation Board backlogs are balanced across Dadar and Jayanagar.</p>
                        </div>
                        <div className="border-l-2 border-emerald-500 pl-3">
                          <p className="font-bold text-white text-[11px]">PWD Capacity Optimal</p>
                          <p className="text-slate-400 mt-0.5">Public Works Department resolved 4 pothole craters in Indiranagar under 24 hours.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 8: AI Recommendations Center */}
              {activeTab === 'recommendations' && (
                <div className="glass-panel p-6 rounded-2xl space-y-6">
                  <div>
                    <h2 className="text-lg font-bold font-['Outfit'] flex items-center gap-2">
                      <BrainCircuit className="h-5 w-5 text-purple-400" />
                      AI Operations Center
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Real-time resource routing advice generated from localized municipal incident metrics.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Priority Operational Alerts</h3>
                      
                      {/* Alert 1 */}
                      <div className="p-4 bg-red-950/25 border border-red-500/25 rounded-xl flex gap-3 text-xs leading-relaxed">
                        <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5 animate-bounce" />
                        <div>
                          <span className="font-bold text-white block">Transformer Sparking in Whitefield</span>
                          <p className="text-slate-400 mt-0.5">Transformer spark report (ID: critical-t1) in Whitefield, Bengaluru poses active fire danger. Immediate lineman overseer V. Prasad dispatch is highly recommended.</p>
                        </div>
                      </div>

                      {/* Alert 2 */}
                      <div className="p-4 bg-yellow-950/25 border border-yellow-500/25 rounded-xl flex gap-3 text-xs leading-relaxed">
                        <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-white block">Sewage Spill in Bandra, Mumbai</span>
                          <p className="text-slate-400 mt-0.5">Critical sewage spill (ID: critical-s2) blocking Bandra shopping lane path. Deploy sanitation vac trucks to avoid merchant storefront contamination.</p>
                        </div>
                      </div>

                      {/* Alert 3 */}
                      <div className="p-4 bg-brand-950/25 border border-brand-500/20 rounded-xl flex gap-3 text-xs leading-relaxed">
                        <BrainCircuit className="h-5 w-5 text-brand-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-white block">Preventive Duplicates Saved Time</span>
                          <p className="text-slate-400 mt-0.5">Sentence Transformer grouped 3 garbage overflow duplicates in Malleswaram, saving 12 officer investigation hours today.</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 bg-slate-950 border border-slate-900 rounded-xl space-y-4 text-xs">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resource Allocation Suggestions</h3>
                      
                      <div className="space-y-3.5 leading-relaxed text-slate-300">
                        <div>
                          <span className="font-semibold text-slate-200 block">Deploy Fogging Crews to Whitefield</span>
                          <p className="text-slate-400 mt-0.5">Mosquito complaints spiked by 40% in Whitefield empty plots. Fogging recommended under 18 hours.</p>
                        </div>

                        <div>
                          <span className="font-semibold text-slate-200 block">Bandra Water Board Support</span>
                          <p className="text-slate-400 mt-0.5">Redistribute secondary PWD crews in Mumbai to assist Bandra water valve leak repairs.</p>
                        </div>

                        <div>
                          <span className="font-semibold text-slate-200 block">Lineman Capacity Balance</span>
                          <p className="text-slate-400 mt-0.5"> lineworker workload in Delhi Dwarka is optimal. Keep V. Prasad overseer teams on alert for high voltage spark complaints.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 9: Export Reports table */}
              {activeTab === 'reports' && (
                <div className="glass-panel p-6 rounded-2xl space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                    <div>
                      <h2 className="text-lg font-bold font-['Outfit']">Reports & Query Exporter</h2>
                      <p className="text-xs text-slate-400 mt-1">Download custom filtered database tables as CSV reports.</p>
                    </div>

                    <button
                      onClick={downloadCSVReport}
                      className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold px-4 py-2.5 rounded-xl transition flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Export Filtered CSV
                    </button>
                  </div>

                  {/* Query Filters */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5 text-xs">
                    <div>
                      <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px]">Text Search</label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-650" />
                        <input
                          type="text"
                          placeholder="Search description, name, ID..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-8 pr-3 py-2 text-xs placeholder-slate-700 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px]">State</label>
                      <select
                        value={stateFilter}
                        onChange={(e) => setStateFilter(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:outline-none"
                      >
                        <option value="ALL">All States</option>
                        {uniqueStates.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px]">City</label>
                      <select
                        value={cityFilter}
                        onChange={(e) => setCityFilter(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:outline-none"
                      >
                        <option value="ALL">All Cities</option>
                        {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px]">Category</label>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:outline-none"
                      >
                        <option value="ALL">All Categories</option>
                        <option value="Sanitation">Sanitation</option>
                        <option value="Water Supply">Water Supply</option>
                        <option value="Roads/Potholes">Roads/Potholes</option>
                        <option value="Electricity">Electricity</option>
                        <option value="Public Health">Public Health</option>
                        <option value="Waste Management">Waste Management</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px]">Priority</label>
                      <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:outline-none"
                      >
                        <option value="ALL">All Priorities</option>
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
                    <div>
                      <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px]">Department</label>
                      <select
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:outline-none"
                      >
                        <option value="ALL">All Departments</option>
                        {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px]">Start Date</label>
                      <input
                        type="date"
                        value={startDateFilter}
                        onChange={(e) => setStartDateFilter(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-2 text-xs text-slate-350 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px]">End Date</label>
                      <input
                        type="date"
                        value={endDateFilter}
                        onChange={(e) => setEndDateFilter(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-2 text-xs text-slate-350 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-900 bg-slate-950">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-900 bg-slate-900/30 text-slate-400 font-semibold uppercase tracking-wider">
                          <th className="py-4 px-3">Complaint ID</th>
                          <th className="py-4 px-3 w-[260px]">Description</th>
                          <th className="py-4 px-3">Citizen</th>
                          <th className="py-4 px-3">Location</th>
                          <th className="py-4 px-3">Category</th>
                          <th className="py-4 px-3">Priority</th>
                          <th className="py-4 px-3">Stage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/50">
                        {filteredComplaints.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-600">
                              No matching records found.
                            </td>
                          </tr>
                        ) : (
                          filteredComplaints.map(item => (
                            <tr 
                              key={item.id} 
                              className={`hover:bg-slate-900/20 transition-colors cursor-pointer ${selectedComplaint?.id === item.id ? 'bg-slate-900/40' : ''}`}
                              onClick={() => setSelectedComplaint(item)}
                            >
                              <td className="py-3 px-3 font-mono font-bold text-slate-500">
                                {item.id.substring(0, 8)}
                              </td>
                              <td className="py-3 px-3 font-medium text-slate-200">
                                <p className="line-clamp-2 max-w-[260px]">"{item.description}"</p>
                              </td>
                              <td className="py-3 px-3 text-slate-400">{item.citizen_name || 'Rahul Sharma'}</td>
                              <td className="py-3 px-3 text-slate-450 font-semibold">{item.locality}, {item.city}</td>
                              <td className="py-3 px-3">
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${getCategoryBadgeColor(item.category)}`}>
                                  {item.category}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${getPriorityBadgeColor(item.priority)}`}>
                                  {item.priority}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <span className="text-[10px] text-slate-400 capitalize">{item.pipeline_stage.replace('_', ' ')}</span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 10: Settings */}
              {activeTab === 'settings' && (
                <div className="glass-panel p-6 rounded-2xl space-y-6">
                  <div>
                    <h2 className="text-lg font-bold font-['Outfit']">System Settings</h2>
                    <p className="text-xs text-slate-400 mt-1">Configure operations thresholds and API keys.</p>
                  </div>

                  <div className="p-4 bg-slate-950 border border-slate-900 rounded-xl space-y-4 max-w-md text-xs text-slate-300">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1.5 uppercase text-[9px]">Active AI Mode</label>
                      <select className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-2 text-xs focus:outline-none">
                        <option>Offline Rules / Local Classification (active)</option>
                        <option>Real-Time PyTorch Transformers (optional)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 font-bold mb-1.5 uppercase text-[9px]">Duplicate Score Threshold</label>
                      <select className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-2 text-xs focus:outline-none">
                        <option>0.70 Cosine Similarity (active)</option>
                        <option>0.80 strict match</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}
        </main>
      </div>

      {/* Side Slide-out Details Drawer */}
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
                  <ChevronRight className="h-4 w-4 rotate-180" />
                  Close Panel
                </button>
                <span className="text-xs text-slate-500">ID: {selectedComplaint.id}</span>
              </div>

              {/* Badges */}
              <div className="flex justify-between items-center">
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${getCategoryBadgeColor(selectedComplaint.category)}`}>
                  {selectedComplaint.category}
                </span>
                <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${getStatusBadgeColor(selectedComplaint.status)}`}>
                  {selectedComplaint.status}
                </span>
              </div>

              {/* Text Detail */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Description</span>
                <p className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-slate-200 text-sm leading-relaxed">
                  "{selectedComplaint.description}"
                </p>
                <span className="text-[10px] text-brand-400 font-semibold block">
                  Filed by {selectedComplaint.citizen_name || 'Rahul Sharma'} • Pincode: {selectedComplaint.pincode || '400028'}
                </span>
              </div>

              {/* Address details */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Real Location System</span>
                <p className="text-xs text-slate-300 bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 leading-relaxed">
                  {selectedComplaint.formatted_address}
                </p>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 pt-1">
                  <span>State: {selectedComplaint.state}</span>
                  <span>City: {selectedComplaint.city}</span>
                </div>
              </div>

              {/* Ingestion Timeline Progress indicator */}
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                <span className="text-xs font-bold text-slate-350 uppercase tracking-wider block">Workflow Ingestion Tracker</span>
                <div className="flex items-center justify-between text-[10px] font-semibold">
                  <span className={selectedComplaint.pipeline_stage === 'Intake' ? 'text-brand-400' : 'text-emerald-400'}>Intake</span>
                  <ChevronRight className="h-3 w-3 text-slate-650" />
                  <span className={['Intake'].includes(selectedComplaint.pipeline_stage) ? 'text-slate-500' : 'text-emerald-400'}>AI Categorized</span>
                  <ChevronRight className="h-3 w-3 text-slate-650" />
                  <span className={['Intake', 'AI_Classification'].includes(selectedComplaint.pipeline_stage) ? 'text-slate-500' : 'text-emerald-400'}>Priority Assigned</span>
                  <ChevronRight className="h-3 w-3 text-slate-650" />
                  <span className={['Intake', 'AI_Classification', 'Priority_Assignment'].includes(selectedComplaint.pipeline_stage) ? 'text-slate-500' : 'text-brand-400'}>Review Queue</span>
                </div>
              </div>

              {/* AI Preds */}
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                <span className="text-xs font-bold text-brand-400 uppercase tracking-wider block flex items-center gap-1">
                  <BrainCircuit className="h-4 w-4" />
                  NagarSetu Pipeline Inference Logs
                </span>

                <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
                  <div>
                    <span className="text-slate-500 block">Classified Priority:</span>
                    <strong className={`${selectedComplaint.priority === 'Critical' ? 'text-red-400' : 'text-slate-200'} font-semibold`}>
                      {selectedComplaint.priority}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Assigned Dept:</span>
                    <strong className="text-slate-200 font-semibold">{selectedComplaint.department || 'Public Works'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Target Resolution ETA:</span>
                    <strong className="text-slate-200 font-semibold">{selectedComplaint.resolution_time || '24 Hours'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Lineman Overseer:</span>
                    <strong className="text-brand-400 font-semibold">{selectedComplaint.officer_recommendation || 'Unassigned'}</strong>
                  </div>
                </div>

                {selectedComplaint.priority_reasoning && (
                  <div className="border-t border-slate-800/60 pt-3 text-xs">
                    <span className="text-slate-500 block">AI Reasoning Log:</span>
                    <p className="text-slate-300 italic mt-1 leading-relaxed bg-slate-900/60 p-2.5 rounded border border-slate-850">
                      "{selectedComplaint.priority_reasoning}"
                    </p>
                  </div>
                )}
              </div>

              {/* Status Update Control */}
              <div className="space-y-3 border-t border-slate-800/60 pt-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Modify Incident State</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateStatus(selectedComplaint.id, 'Assigned')}
                    className={`flex-1 text-[11px] py-2 rounded-lg font-bold border transition ${
                      selectedComplaint.status === 'Assigned' 
                        ? 'bg-brand-500 border-brand-500 text-slate-950' 
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    Assign
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedComplaint.id, 'In_Progress')}
                    className={`flex-1 text-[11px] py-2 rounded-lg font-bold border transition ${
                      selectedComplaint.status === 'In_Progress' 
                        ? 'bg-amber-600 border-amber-500 text-slate-950' 
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    In Progress
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedComplaint.id, 'Resolved')}
                    className={`flex-1 text-[11px] py-2 rounded-lg font-bold border transition ${
                      selectedComplaint.status === 'Resolved' 
                        ? 'bg-emerald-600 border-emerald-500 text-slate-950' 
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    Resolve
                  </button>
                </div>
              </div>

              {/* Resolution Notes log */}
              {selectedComplaint.officer_notes && (
                <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-slate-400">Lineman Clearance Report:</span>
                  <p className="text-slate-300">"{selectedComplaint.officer_notes}"</p>
                </div>
              )}

            </div>

            <button 
              onClick={() => setSelectedComplaint(null)}
              className="w-full mt-6 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2.5 rounded-lg border border-slate-700 transition"
            >
              Close Drawer Panel
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// Loader Icon
function LoaderIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1021 12h-4.5" />
    </svg>
  );
}

// Styled badges helpers
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

// Custom Client-side Aggregation calculator for zero config fallbacks
function computeClientStats(dataList) {
  const categories = {};
  const departments = {};
  const cities = {};
  const states = {};
  const localities = {};
  
  let resolved = 0;
  let critical = 0;
  let totalHours = 0;
  let resolvedCountWithDuration = 0;

  dataList.forEach(c => {
    categories[c.category] = (categories[c.category] || 0) + 1;
    if (c.department) departments[c.department] = (departments[c.department] || 0) + 1;
    cities[c.city] = (cities[c.city] || 0) + 1;
    states[c.state] = (states[c.state] || 0) + 1;
    
    const locKey = `${c.locality} (${c.city})`;
    localities[locKey] = (localities[locKey] || 0) + 1;

    if (c.status === 'Resolved') resolved++;
    if (c.priority === 'Critical') critical++;
    
    if (c.resolved_duration_hours) {
      totalHours += c.resolved_duration_hours;
      resolvedCountWithDuration++;
    }
  });

  const categoriesChart = Object.keys(categories).map(k => ({ name: k, value: categories[k] }));
  const departmentsChart = Object.keys(departments).map(k => ({ name: k.split(' ')[0], value: departments[k] }));
  const citiesChart = Object.keys(cities).map(k => ({ name: k, value: cities[k] }));
  const statesChart = Object.keys(states).map(k => ({ name: k, value: states[k] }));
  
  const sortedLocs = Object.keys(localities).map(k => ({ name: k, value: localities[k] })).sort((a,b) => b.value - a.value);
  const sortedCities = Object.keys(cities).map(k => {
    const st = dataList.find(c => c.city === k)?.state || 'India';
    return { name: k, state: st, value: cities[k] };
  }).sort((a,b) => b.value - a.value);

  // Hourly mock
  const hourly_distribution = [
    { hour: '12:00 AM', value: 2 },
    { hour: '04:00 AM', value: 0 },
    { hour: '08:00 AM', value: 12 },
    { hour: '12:00 PM', value: 15 },
    { hour: '04:00 PM', value: 8 },
    { hour: '08:00 PM', value: 10 }
  ];

  return {
    states: statesChart,
    cities: citiesChart,
    top_localities: sortedLocs,
    top_cities: sortedCities,
    departments: departmentsChart,
    categories: categoriesChart,
    daily_trends: [
      { date: 'Jul 12', value: 5 },
      { date: 'Jul 13', value: 9 },
      { date: 'Jul 14', value: 12 },
      { date: 'Jul 15', value: 14 },
      { date: 'Jul 16', value: 18 },
      { date: 'Jul 17', value: dataList.length - 5 },
      { date: 'Jul 18', value: dataList.length }
    ],
    weekly_trends: [
      { week: 'Wk -3', value: 12 },
      { week: 'Wk -2', value: 16 },
      { week: 'Wk -1', value: 20 },
      { week: 'Wk -0', value: dataList.length }
    ],
    monthly_trends: [
      { month: 'May', value: 14 },
      { month: 'June', value: 24 },
      { month: 'July', value: dataList.length }
    ],
    hourly_distribution: hourly_distribution,
    resolution_rate: round((resolved / (dataList.length || 1)) * 100, 1),
    avg_resolution_hours: resolvedCountWithDuration > 0 ? round(totalHours / resolvedCountWithDuration, 1) : 22.4,
    prevented_duplicates: dataList.filter(c => c.status === 'Resolved' && (c.officer_notes?.includes('duplicate') || c.officer_notes?.includes('merged'))).length || 4,
    ai_predictions: [
      { category: "Sanitation", accuracy: 97.2 },
      { category: "Water Supply", accuracy: 95.8 },
      { category: "Roads/Potholes", accuracy: 98.1 },
      { category: "Electricity", accuracy: 94.5 },
      { category: "Public Health", accuracy: 96.0 },
      { category: "Waste Management", accuracy: 97.5 }
    ]
  };
}

function round(value, precision) {
  var multiplier = Math.pow(10, precision || 0);
  return Math.round(value * multiplier) / multiplier;
}

// Seseeded Indian location complaints fallback list
function getDemoMunicipalityComplaints() {
  return [
    {
      id: "complaint-1",
      description: "Heavy drinking water leakage from pipeline valve under Shivaji Park main gate, wasting thousands of liters.",
      category: "Water Supply",
      priority: "High",
      country: "India",
      state: "Maharashtra",
      district: "Mumbai City",
      city: "Mumbai",
      locality: "Shivaji Park",
      pincode: "400028",
      formatted_address: "Shivaji Park, Mumbai, Mumbai City, Maharashtra - 400028, India",
      pipeline_stage: "In_Progress",
      citizen_name: "Amit Patel",
      submission_hour: 9,
      latitude: 19.0261,
      longitude: 72.8373,
      department: "Water Supply & Sewerage Board",
      resolution_time: "24 Hours",
      status: "In_Progress",
      priority_reasoning: "Fresh water line rupture in public recreation park.",
      officer_recommendation: "K. Ramesh (Water Inspector)",
      created_at: "2026-07-14T09:12:00Z"
    },
    {
      id: "complaint-2",
      description: "Stinking sewer water overflowing from open manholes on Bandra West main shopping lane. Pedestrians can't walk.",
      category: "Sanitation",
      priority: "Critical",
      country: "India",
      state: "Maharashtra",
      district: "Mumbai City",
      city: "Mumbai",
      locality: "Bandra",
      pincode: "400050",
      formatted_address: "Bandra West, Mumbai, Mumbai City, Maharashtra - 400050, India",
      pipeline_stage: "In_Progress",
      citizen_name: "Priya Nair",
      submission_hour: 18,
      latitude: 19.0596,
      longitude: 72.8295,
      department: "Health and Sanitation Commission",
      resolution_time: "12 Hours",
      status: "In_Progress",
      priority_reasoning: "Sewer overflow in highly crowded shopping strip represents immediate biological hazard.",
      officer_recommendation: "Dr. A. Sharma (Chief Sanitation Officer)",
      created_at: "2026-07-16T18:30:00Z"
    },
    {
      id: "complaint-3",
      description: "Streetlights completely dark on Dwarka block G lane for 4 nights, feels extremely unsafe.",
      category: "Electricity",
      priority: "Medium",
      country: "India",
      state: "Delhi",
      district: "New Delhi",
      city: "New Delhi",
      locality: "Dwarka",
      pincode: "110075",
      formatted_address: "Dwarka, New Delhi, New Delhi, Delhi - 110075, India",
      pipeline_stage: "Officer_Review",
      citizen_name: "Rohan Mehta",
      submission_hour: 20,
      latitude: 28.5860,
      longitude: 77.0589,
      department: "Electricity Distribution Board",
      resolution_time: "48 Hours",
      status: "Assigned",
      priority_reasoning: "Light blackout in residential lane, pedestrian safety concerns.",
      officer_recommendation: "V. Prasad (Lineman Overseer)",
      created_at: "2026-07-13T20:40:00Z"
    },
    {
      id: "complaint-4",
      description: "A cluster of dangerous potholes has formed near Indiranagar Double Road metro pillar. Two bikers fell today.",
      category: "Roads/Potholes",
      priority: "High",
      country: "India",
      state: "Karnataka",
      district: "Bengaluru Urban",
      city: "Bengaluru",
      locality: "Indiranagar",
      pincode: "560038",
      formatted_address: "Indiranagar, Bengaluru, Bengaluru Urban, Karnataka - 560038, India",
      pipeline_stage: "In_Progress",
      citizen_name: "Vikram Sen",
      submission_hour: 17,
      latitude: 12.9784,
      longitude: 77.6408,
      department: "Public Works Department",
      resolution_time: "24 Hours",
      status: "In_Progress",
      priority_reasoning: "Deep asphalt crater on high-speed lane. Threat to two-wheeler safety.",
      officer_recommendation: "S. Murthy (PWD Inspector)",
      created_at: "2026-07-15T17:15:00Z"
    },
    {
      id: "complaint-5",
      description: "Extreme mosquito breeding in waterlogged empty plots in Whitefield. Malaria cases are spiking.",
      category: "Public Health",
      priority: "High",
      country: "India",
      state: "Karnataka",
      district: "Bengaluru Urban",
      city: "Bengaluru",
      locality: "Whitefield",
      pincode: "560066",
      formatted_address: "Whitefield, Bengaluru, Bengaluru Urban, Karnataka - 560066, India",
      pipeline_stage: "Officer_Review",
      citizen_name: "Sneha Rao",
      submission_hour: 19,
      latitude: 12.9698,
      longitude: 77.7499,
      department: "Health and Sanitation Commission",
      resolution_time: "24 Hours",
      status: "Pending",
      priority_reasoning: "Stagnant pools trigger vector-borne disease outbreak alert.",
      officer_recommendation: "Dr. A. Sharma (Chief Sanitation Officer)",
      created_at: "2026-07-17T19:05:00Z"
    }
  ];
}

function getDemoDuplicateGroups() {
  return [
    {
      id: "dup-group-1",
      similarity_score: 0.925,
      primary_complaint: {
        id: "complaint-2",
        description: "Stinking sewer water overflowing from open manholes on Bandra West main shopping lane.",
        city: "Mumbai",
        locality: "Bandra",
        created_at: new Date()
      },
      secondary_complaints: [
        {
          id: "complaint-sub-1",
          description: "Raw sewage water leaking from drains onto Bandra shopping pathway, smells disgusting.",
          city: "Mumbai",
          locality: "Bandra",
          created_at: new Date()
        }
      ]
    }
  ];
}
