import React, { useState, useEffect } from 'react';
import { Issue, IssueStatus, AssignedOfficer, ResourceAllocation, CityMetrics } from '../types';
import { initialCityMetrics, translations } from '../mockData';
import { 
  ShieldAlert, UserCheck, Check, X, ArrowUpRight, TrendingUp, AlertTriangle, 
  Settings, Users, Wrench, HeartHandshake, Shield, Sparkles, AlertCircle, Bot, Zap, ShieldCheck 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

interface MunicipalityDashboardProps {
  lang: 'en' | 'es' | 'hi' | 'ja' | 'mr';
  issues: Issue[];
  metrics: CityMetrics;
  currentUser?: any;
  onUpdateIssue: (updatedIssue: Issue) => void;
  onUpdateIssues?: (updatedIssues: Issue[]) => void;
}

export default function MunicipalityDashboard({ lang, issues, metrics, currentUser, onUpdateIssue, onUpdateIssues }: MunicipalityDashboardProps) {
  const [feedTab, setFeedTab] = useState<'active' | 'verification' | 'history' | 'users'>('active');
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(issues[0]?.id || null);
  
  // User Registry Management States
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersError, setUsersError] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);

  const fetchUsers = async () => {
    setUsersLoading(true);
    setUsersError('');
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch user list.');
      setUsersList(data);
    } catch (e: any) {
      setUsersError(e.message || 'Unauthorized administrative access.');
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (feedTab === 'users') {
      fetchUsers();
    }
  }, [feedTab]);

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you absolutely sure you want to permanently remove this user account from the system? This action cannot be undone.')) {
      return;
    }
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user.');
      
      // Refresh registry
      fetchUsers();
    } catch (e: any) {
      alert(e.message || 'Account removal failed.');
    }
  };

  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);
  const [assigneeName, setAssigneeName] = useState('');
  const [isCustomOfficer, setIsCustomOfficer] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDept, setCustomDept] = useState('Public Works Division');
  const [customRole, setCustomRole] = useState('Service Officer');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [budgetInput, setBudgetInput] = useState('₹90,000');
  const [assignedBudgetInput, setAssignedBudgetInput] = useState<string>('90000');
  const [spentBudgetInput, setSpentBudgetInput] = useState<string>('45000');
  const [teamsCount, setTeamsCount] = useState(1);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);

  // Bulk operation states
  const [bulkStatusNote, setBulkStatusNote] = useState('Bulk status modification executed via administrative command panel.');
  const [bulkAssigneeName, setBulkAssigneeName] = useState('');
  const [isBulkCustomOfficer, setIsBulkCustomOfficer] = useState(false);
  const [bulkCustomName, setBulkCustomName] = useState('');
  const [bulkCustomDept, setBulkCustomDept] = useState('Public Works Division');
  const [bulkCustomRole, setBulkCustomRole] = useState('Service Officer');

  // Filter out duplicate issue IDs to always render single unified records
  const uniqueIssues = issues.filter(i => !i.isDuplicateOf);

  const filteredIssues = uniqueIssues.filter(issue => {
    if (feedTab === 'active') {
      return issue.status !== 'resolved' && issue.status !== 'closed' && issue.status !== 'archived';
    } else if (feedTab === 'verification') {
      return issue.status === 'resolved';
    } else if (feedTab === 'history') {
      return issue.status === 'closed' || issue.status === 'archived';
    }
    return true;
  });

  // Selected issue
  const activeIssue = filteredIssues.find(i => i.id === selectedIssueId) || filteredIssues[0];

  useEffect(() => {
    if (filteredIssues.length > 0) {
      const currentExists = filteredIssues.some(i => i.id === selectedIssueId);
      if (!currentExists) {
        setSelectedIssueId(filteredIssues[0].id);
      }
    } else {
      setSelectedIssueId(null);
    }
  }, [feedTab, issues]);

  const activeProjectsData = uniqueIssues
    .filter(i => 
      i.status !== 'resolved' && 
      i.status !== 'closed' && 
      i.status !== 'archived' && 
      i.resourceAllocation && 
      ((i.resourceAllocation.assignedBudget ?? 0) > 0 || (i.resourceAllocation.spentBudget ?? 0) > 0)
    )
    .map(i => ({
      name: i.title.length > 20 ? i.title.substring(0, 18) + '...' : i.title,
      fullName: i.title,
      'Budget Allocated': i.resourceAllocation?.assignedBudget ?? 0,
      'Budget Spent': i.resourceAllocation?.spentBudget ?? 0
    }));

  useEffect(() => {
    if (activeIssue) {
      setBudgetInput(activeIssue.resourceAllocation?.budget || '₹0');
      setTeamsCount(activeIssue.resourceAllocation?.teams || 1);
      setAssignedBudgetInput(String(activeIssue.resourceAllocation?.assignedBudget ?? '0'));
      setSpentBudgetInput(String(activeIssue.resourceAllocation?.spentBudget ?? '0'));
    }
  }, [activeIssue?.id]);
  const officersPool = [
    { name: 'Officer Sandeep Vardhan', dept: 'Roads & Asphalt Div', role: 'Chief Engineer', resolved: 42, avgTime: '18h', rating: 4.9 },
    { name: 'Officer Alok Chaudhari', dept: 'Emergency Grid Response', role: 'Hazard Supervisor', resolved: 58, avgTime: '4h', rating: 4.9 },
    { name: 'Officer Laxmi Dixit', dept: 'Hydraulics & Drainage Div', role: 'Hydraulic Specialist', resolved: 29, avgTime: '22h', rating: 4.7 },
    { name: 'Officer Jagdish Patil', dept: 'Public Lighting Div', role: 'Senior Electrician', resolved: 35, avgTime: '15h', rating: 4.8 }
  ];

  const equipmentList = [
    'Asphalt Roller', 'Tamping Machine', 'Warning Barriers', 'Insulated Bucket Truck', 
    'Circuit Isolation Unit', 'New Cabling', 'Excavator', 'Water Sump Pump', 'Pipe Clamp Kit'
  ];

  const handleStatusChange = (newStatus: IssueStatus, logNote: string) => {
    if (!activeIssue) return;

    const updated: Issue = {
      ...activeIssue,
      status: newStatus,
      timeline: [
        ...activeIssue.timeline,
        {
          status: newStatus,
          timestamp: new Date().toISOString(),
          note: logNote,
          actor: 'Municipal Admin Office'
        }
      ]
    };
    onUpdateIssue(updated);
  };

  const handleAssignOfficer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeIssue) return;

    let finalName = assigneeName;
    let finalDept = 'Public Works Division';
    let finalRole = 'Service Officer';

    if (isCustomOfficer) {
      if (!customName.trim()) return;
      finalName = customName.trim();
      finalDept = customDept.trim() || 'Public Works Division';
      finalRole = customRole.trim() || 'Service Officer';
    } else {
      if (!assigneeName) return;
      const matchedOfficer = officersPool.find(o => o.name === assigneeName);
      finalDept = matchedOfficer?.dept || 'Public Works Division';
      finalRole = matchedOfficer?.role || 'Service Officer';
    }

    const assigned: AssignedOfficer = {
      name: finalName,
      dept: finalDept,
      role: finalRole,
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // 48h deadline
    };

    // Auto calculate resources suggestion based on issue type
    const suggestedBudget = activeIssue.type === 'electricity' ? '₹2,10,000' :
                            activeIssue.type === 'water_leak' ? '₹1,50,000' :
                            activeIssue.type === 'pothole' ? '₹90,000' : '₹25,000';
    
    const suggestedEquipment = activeIssue.type === 'electricity' ? ['Insulated Crane', 'Circuit Breakers'] :
                               activeIssue.type === 'water_leak' ? ['Water Pump', 'Clamp Repair Kit'] :
                               activeIssue.type === 'pothole' ? ['Asphalt Compactor', 'Barriers'] : ['Garbage Hauler'];

    const updated: Issue = {
      ...activeIssue,
      status: 'assigned',
      assignedOfficer: assigned,
      resourceAllocation: {
        teams: 1,
        budget: suggestedBudget,
        equipment: suggestedEquipment
      },
      timeline: [
        ...activeIssue.timeline,
        {
          status: 'assigned',
          timestamp: new Date().toISOString(),
          note: `Assigned on-site dispatch role to ${finalName}. Service level priority SLA set to ${activeIssue.repairTime}.`,
          actor: 'Municipal Dispatch'
        }
      ]
    };

    onUpdateIssue(updated);
    setAssigneeName('');
    setCustomName('');
    setIsCustomOfficer(false);
  };

  const handleDeployInspection = (verifiedStatus: 'valid' | 'invalid' | 'resolved_already') => {
    if (!activeIssue) return;

    const updated: Issue = {
      ...activeIssue,
      status: 'inspection',
      inspectionReport: {
        inspectorName: activeIssue.assignedOfficer?.name || 'Assigned Officer Inspect',
        verifiedStatus,
        notes: inspectionNotes || 'Inspection team verified reported damage dimensions and risk coordinates.',
        timestamp: new Date().toISOString()
      },
      timeline: [
        ...activeIssue.timeline,
        {
          status: 'inspection',
          timestamp: new Date().toISOString(),
          note: `On-site inspection executed. Certified status as: [${verifiedStatus.toUpperCase()}]. Notes: ${inspectionNotes || 'Completed standard site profiling.'}`,
          actor: activeIssue.assignedOfficer?.name || 'Inspection Inspector'
        }
      ]
    };

    onUpdateIssue(updated);
    setInspectionNotes('');
  };

  const handleUpdateResources = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeIssue) return;

    const numAssigned = parseFloat(assignedBudgetInput) || 0;
    const numSpent = parseFloat(spentBudgetInput) || 0;

    const updatedResource: ResourceAllocation = {
      teams: teamsCount,
      budget: `₹${numAssigned.toLocaleString('en-IN')}`,
      equipment: selectedEquipment.length > 0 ? selectedEquipment : ['Standard Safety Warning barriers'],
      assignedBudget: numAssigned,
      spentBudget: numSpent
    };

    const updated: Issue = {
      ...activeIssue,
      resourceAllocation: updatedResource,
      timeline: [
        ...activeIssue.timeline,
        {
          status: activeIssue.status,
          timestamp: new Date().toISOString(),
          note: `Adjusted active municipal resource log: ${teamsCount} team(s), assigned budget of ₹${numAssigned.toLocaleString('en-IN')}, spent budget of ₹${numSpent.toLocaleString('en-IN')}. Heavy machinery allocated.`,
          actor: 'Municipal Resource Desk'
        }
      ]
    };

    onUpdateIssue(updated);
    setSelectedEquipment([]);
  };

  const handleEscalateIssue = () => {
    if (!activeIssue) return;

    // Increase severity and risk score
    const updated: Issue = {
      ...activeIssue,
      severity: 'urgent',
      riskScore: Math.min(activeIssue.riskScore + 15, 100),
      timeline: [
        ...activeIssue.timeline,
        {
          status: 'escalated' as any,
          timestamp: new Date().toISOString(),
          note: 'CRITICAL ESCALATION: Auto-escalated due to safety risk compliance. Dispatched secondary hazard alerts.',
          actor: 'Emergency Compliance Core'
        }
      ]
    };

    onUpdateIssue(updated);
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeIssue || !rejectReason) return;

    const updated: Issue = {
      ...activeIssue,
      status: 'closed',
      timeline: [
        ...activeIssue.timeline,
        {
          status: 'closed',
          timestamp: new Date().toISOString(),
          note: `Issue rejected / closed by Admin. Reason: ${rejectReason}`,
          actor: 'Admin Auditor'
        }
      ]
    };

    onUpdateIssue(updated);
    setShowRejectModal(false);
    setRejectReason('');
  };

  // Bulk state modifications
  const handleBulkStatusChange = (newStatus: IssueStatus, logNote: string) => {
    if (selectedIssueIds.length === 0) return;
    const updatedIssuesList = issues.map(issue => {
      if (selectedIssueIds.includes(issue.id)) {
        return {
          ...issue,
          status: newStatus,
          timeline: [
            ...issue.timeline,
            {
              status: newStatus,
              timestamp: new Date().toISOString(),
              note: logNote || `Bulk status update to ${newStatus.replace('_', ' ')}.`,
              actor: 'Municipal Admin Office (Bulk Action)'
            }
          ]
        };
      }
      return issue;
    });

    if (onUpdateIssues) {
      onUpdateIssues(updatedIssuesList.filter(i => selectedIssueIds.includes(i.id)));
    } else {
      selectedIssueIds.forEach(id => {
        const issue = issues.find(i => i.id === id);
        if (issue) {
          onUpdateIssue({
            ...issue,
            status: newStatus,
            timeline: [
              ...issue.timeline,
              {
                status: newStatus,
                timestamp: new Date().toISOString(),
                note: logNote || `Bulk status update to ${newStatus.replace('_', ' ')}.`,
                actor: 'Municipal Admin Office (Bulk Action)'
              }
            ]
          });
        }
      });
    }
    setSelectedIssueIds([]);
  };

  const handleBulkAssignOfficerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIssueIds.length === 0) return;

    let finalName = bulkAssigneeName;
    let finalDept = 'Public Works Division';
    let finalRole = 'Service Officer';

    if (isBulkCustomOfficer) {
      if (!bulkCustomName.trim()) return;
      finalName = bulkCustomName.trim();
      finalDept = bulkCustomDept.trim() || 'Public Works Division';
      finalRole = bulkCustomRole.trim() || 'Service Officer';
    } else {
      if (!bulkAssigneeName) return;
      const matchedOfficer = officersPool.find(o => o.name === bulkAssigneeName);
      finalDept = matchedOfficer?.dept || 'Public Works Division';
      finalRole = matchedOfficer?.role || 'Service Officer';
    }

    const assigned: AssignedOfficer = {
      name: finalName,
      dept: finalDept,
      role: finalRole,
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // 48h deadline
    };

    const updatedIssuesList = issues.map(issue => {
      if (selectedIssueIds.includes(issue.id)) {
        const suggestedBudget = issue.type === 'electricity' ? '₹2,10,000' :
                                issue.type === 'water_leak' ? '₹1,50,000' :
                                issue.type === 'pothole' ? '₹90,000' : '₹25,000';
        
        const suggestedEquipment = issue.type === 'electricity' ? ['Insulated Crane', 'Circuit Breakers'] :
                                   issue.type === 'water_leak' ? ['Water Pump', 'Clamp Repair Kit'] :
                                   issue.type === 'pothole' ? ['Asphalt Compactor', 'Barriers'] : ['Garbage Hauler'];

        return {
          ...issue,
          status: 'assigned' as IssueStatus,
          assignedOfficer: assigned,
          resourceAllocation: {
            teams: 1,
            budget: suggestedBudget,
            equipment: suggestedEquipment
          },
          timeline: [
            ...issue.timeline,
            {
              status: 'assigned' as IssueStatus,
              timestamp: new Date().toISOString(),
              note: `Bulk Assigned on-site dispatch role to ${finalName} by Admin. SLA priority set to ${issue.repairTime}.`,
              actor: 'Municipal Dispatch (Bulk Action)'
            }
          ]
        };
      }
      return issue;
    });

    if (onUpdateIssues) {
      onUpdateIssues(updatedIssuesList.filter(i => selectedIssueIds.includes(i.id)));
    } else {
      selectedIssueIds.forEach(id => {
        const issue = issues.find(i => i.id === id);
        if (issue) {
          const suggestedBudget = issue.type === 'electricity' ? '₹2,10,000' :
                                  issue.type === 'water_leak' ? '₹1,50,000' :
                                  issue.type === 'pothole' ? '₹90,000' : '₹25,000';
          
          const suggestedEquipment = issue.type === 'electricity' ? ['Insulated Crane', 'Circuit Breakers'] :
                                     issue.type === 'water_leak' ? ['Water Pump', 'Clamp Repair Kit'] :
                                     issue.type === 'pothole' ? ['Asphalt Compactor', 'Barriers'] : ['Garbage Hauler'];

          onUpdateIssue({
            ...issue,
            status: 'assigned',
            assignedOfficer: assigned,
            resourceAllocation: {
              teams: 1,
              budget: suggestedBudget,
              equipment: suggestedEquipment
            },
            timeline: [
              ...issue.timeline,
              {
                status: 'assigned',
                timestamp: new Date().toISOString(),
                note: `Bulk Assigned on-site dispatch role to ${finalName} by Admin. SLA priority set to ${issue.repairTime}.`,
                actor: 'Municipal Dispatch (Bulk Action)'
              }
            ]
          });
        }
      });
    }

    setSelectedIssueIds([]);
    setBulkAssigneeName('');
    setBulkCustomName('');
    setIsBulkCustomOfficer(false);
  };

  const handleEquipmentToggle = (eq: string) => {
    if (selectedEquipment.includes(eq)) {
      setSelectedEquipment(selectedEquipment.filter(e => e !== eq));
    } else {
      setSelectedEquipment([...selectedEquipment, eq]);
    }
  };

  // Determine priority level (P1-P5) based on severity
  const getPriorityLevel = (severity: string) => {
    switch (severity) {
      case 'urgent': return 'P1 (Critical / Emergency)';
      case 'high': return 'P2 (High Priority)';
      case 'medium': return 'P3 (Medium Support)';
      case 'low': return 'P4 (Routine Maintenance)';
      default: return 'P5 (Deferred)';
    }
  };

  // Has any active emergency issues?
  const emergencyIssues = issues.filter(i => i.isEmergency && i.status !== 'closed' && i.status !== 'resolved');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Emergency Mode Beacon Alert */}
      {emergencyIssues.length > 0 && (
        <div className="mb-8 p-4 bg-brand-danger text-white rounded-3xl border border-brand-danger/30 flex flex-col md:flex-row items-center justify-between gap-4 shadow-brand-lg animate-pulse">
          <div className="flex items-center gap-3 text-center md:text-left">
            <AlertCircle className="w-8 h-8 text-white flex-shrink-0 animate-bounce" />
            <div>
              <h2 className="font-extrabold text-lg uppercase tracking-wider font-display">⚠️ EMERGENCY LEVEL ALERT ON GRID</h2>
              <p className="text-xs opacity-90 font-medium leading-relaxed">
                AI Vision has classified {emergencyIssues.length} active hazardous situations (electrical sparks, water flooding). Emergency crews auto-notified!
              </p>
            </div>
          </div>
          <span className="px-4 py-1.5 bg-white text-brand-danger font-extrabold text-xs rounded-xl uppercase tracking-widest">
            Active Hazard Beacon
          </span>
        </div>
      )}

      {/* Top Section: Admin Header & City Health Score sliders */}
      <div className="mb-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-2">
          <h1 className="text-3xl font-display font-bold text-brand-text-main flex items-center gap-2.5">
            <Settings className="w-8 h-8 text-brand-primary" />
            <span>Smart City Governance Portal</span>
          </h1>
          {currentUser && (
            <div className="mt-3 inline-flex items-center gap-2.5 bg-brand-primary/10 border border-brand-primary/20 px-4 py-2 rounded-2xl text-xs font-bold text-brand-primary">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-success animate-pulse"></span>
              <span>Active Operator: <strong className="text-brand-text-main">{currentUser.name}</strong> ({currentUser.role})</span>
            </div>
          )}
          <p className="text-brand-text-sub mt-2">
            Professional operations panel for dispatchers, engineers, and municipal administrators.
          </p>
        </div>

        {/* City Health Score breakdown */}
        <div className="lg:col-span-2 bg-brand-card border border-brand-border p-5 rounded-3xl flex items-center justify-between gap-6 shadow-brand-sm">
          <div>
            <span className="text-xs text-brand-text-sub font-bold uppercase tracking-wider block">City Health Score Index</span>
            <span className="text-3xl font-mono font-extrabold text-brand-primary mt-1 block">{metrics.healthScore}/100</span>
            <p className="text-[10px] text-brand-text-sub mt-1">Weighted aggregation of {issues.length} regional reports.</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-brand-text-sub">
            <div>🛣️ Road Health: <span className="text-brand-text-main">{metrics.roadsScore}%</span></div>
            <div>⚡ Utility Grid: <span className="text-brand-text-main">{metrics.electricityScore}%</span></div>
            <div>💧 Hydraulics: <span className="text-brand-text-main">{metrics.waterScore}%</span></div>
            <div>🗑️ Waste: <span className="text-brand-text-main">{metrics.wasteScore}%</span></div>
          </div>
        </div>
      </div>

      {/* Financial Visibility Section */}
      <div className="mb-8 bg-brand-card border border-brand-border p-6 rounded-3xl shadow-brand-sm">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold font-display text-brand-text-main flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-primary animate-pulse" />
              <span>Active Projects Financial Auditing</span>
            </h2>
            <p className="text-xs text-brand-text-sub mt-1">
              Real-time monitoring of budget spent versus allocated resources for ongoing operations.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-xs font-mono font-bold">
            <div className="flex items-center gap-2 bg-brand-bg px-3 py-1.5 rounded-xl border border-brand-border">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-primary"></span>
              <span className="text-brand-text-sub">Total Allocated: <span className="text-brand-text-main">₹{activeProjectsData.reduce((acc, curr) => acc + curr['Budget Allocated'], 0).toLocaleString('en-IN')}</span></span>
            </div>
            <div className="flex items-center gap-2 bg-brand-bg px-3 py-1.5 rounded-xl border border-brand-border">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span>
              <span className="text-brand-text-sub">Total Spent: <span className="text-brand-text-main">₹{activeProjectsData.reduce((acc, curr) => acc + curr['Budget Spent'], 0).toLocaleString('en-IN')}</span></span>
            </div>
          </div>
        </div>

        {activeProjectsData.length === 0 ? (
          <div className="h-[180px] flex flex-col items-center justify-center text-center bg-brand-bg/50 border border-dashed border-brand-border rounded-2xl p-6">
            <Bot className="w-8 h-8 text-brand-text-sub/40 mb-2 animate-bounce" />
            <p className="text-xs text-brand-text-sub font-semibold">No active projects with budget allocations found.</p>
            <p className="text-[10px] text-brand-text-sub mt-1">Allocate budget to ongoing tickets in the Operations panel below.</p>
          </div>
        ) : (
          <div className="h-[280px] w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={activeProjectsData}
                margin={{ top: 10, right: 10, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  stroke="var(--text-sub)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  stroke="var(--text-sub)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, '']}
                  contentStyle={{ 
                    backgroundColor: 'var(--card-bg)', 
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: 'var(--text-main)'
                  }}
                />
                <Legend />
                <Bar dataKey="Budget Allocated" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Allocated (₹)" />
                <Bar dataKey="Budget Spent" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Spent (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Main Panel Content */}
      {feedTab === 'users' ? (
        <div className="bg-brand-card border border-brand-border rounded-3xl p-6 shadow-brand-sm">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold font-display text-brand-text-main flex items-center gap-2">
                <Users className="w-6 h-6 text-brand-primary" />
                <span>System User Account Registry</span>
              </h2>
              <p className="text-xs text-brand-text-sub mt-1">
                View registered citizens, administrator accounts, system activity standing, and execute account removals.
              </p>
            </div>
            <button
              onClick={fetchUsers}
              disabled={usersLoading}
              className="px-4 py-2 bg-brand-bg hover:bg-brand-card border border-brand-border rounded-xl text-xs font-bold text-brand-text-main flex items-center gap-2 cursor-pointer transition-colors"
            >
              Refresh Registry
            </button>
          </div>

          {usersLoading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-4 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin"></div>
              <span className="text-xs text-brand-text-sub mt-3 font-semibold">Loading user accounts...</span>
            </div>
          ) : usersError ? (
            <div className="p-4 bg-brand-danger/10 border border-brand-danger/20 text-brand-danger rounded-xl text-xs flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5" />
              <span>{usersError}</span>
            </div>
          ) : usersList.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-brand-border rounded-2xl">
              <Users className="w-12 h-12 text-brand-text-sub/30 mx-auto mb-3" />
              <p className="text-sm font-semibold text-brand-text-sub">No user accounts registered.</p>
              <p className="text-xs text-brand-text-sub mt-1">Users will appear here once they complete account registration.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-brand-border text-brand-text-sub font-semibold uppercase tracking-wider text-[10px]">
                    <th className="pb-3 pl-4">Full Name</th>
                    <th className="pb-3">Email Address</th>
                    <th className="pb-3">Access Role</th>
                    <th className="pb-3">Civic XP Standing</th>
                    <th className="pb-3 text-center">Action Order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/60">
                  {usersList.map((usr) => (
                    <tr key={usr.id} className="hover:bg-brand-bg/40 transition-colors">
                      <td className="py-4 pl-4 font-bold text-brand-text-main flex items-center gap-2">
                        <div className="w-7 h-7 bg-brand-primary-light text-brand-primary font-bold rounded-lg flex items-center justify-center text-[10px]">
                          {usr.name.charAt(0)}
                        </div>
                        <span>{usr.name}</span>
                      </td>
                      <td className="py-4 font-mono text-brand-text-sub">{usr.email}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-md font-bold text-[10px] uppercase ${
                          usr.role === 'Admin' ? 'bg-brand-primary-light text-brand-primary' : 'bg-brand-success/10 text-brand-success'
                        }`}>
                          {usr.role}
                        </span>
                      </td>
                      <td className="py-4 font-mono font-bold text-brand-text-main">{usr.xp} XP</td>
                      <td className="py-4 text-center">
                        {usr.id === currentUser?.id ? (
                          <span className="text-[10px] font-bold text-brand-text-sub italic">You (Current Admin)</span>
                        ) : (
                          <button
                            onClick={() => handleDeleteUser(usr.id)}
                            className="px-2.5 py-1.5 border border-brand-danger/30 hover:bg-brand-danger/10 text-brand-danger text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            Remove User
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: List of issues for selection */}
        <div className="space-y-4">
          <div className="bg-brand-card border border-brand-border rounded-3xl p-5 shadow-brand-sm">
            <span className="text-xs font-bold text-brand-text-sub uppercase tracking-widest block mb-3">Operations Feed</span>
            
            {/* Elegant high-contrast tab selector */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1 bg-brand-bg p-1 rounded-2xl border border-brand-border mb-3">
              <button
                type="button"
                id="feed-tab-active"
                onClick={() => setFeedTab('active')}
                className={`py-2 text-[10px] font-extrabold rounded-xl transition-all uppercase tracking-wider cursor-pointer ${
                  feedTab === 'active'
                    ? 'bg-brand-primary text-white shadow-brand-sm'
                    : 'text-brand-text-sub hover:text-brand-text-main'
                }`}
              >
                Active ({uniqueIssues.filter(i => i.status !== 'resolved' && i.status !== 'closed' && i.status !== 'archived').length})
              </button>
              <button
                type="button"
                id="feed-tab-verification"
                onClick={() => setFeedTab('verification')}
                className={`py-2 text-[10px] font-extrabold rounded-xl transition-all uppercase tracking-wider cursor-pointer ${
                  feedTab === 'verification'
                    ? 'bg-brand-primary text-white shadow-brand-sm'
                    : 'text-brand-text-sub hover:text-brand-text-main'
                }`}
              >
                Verify ({uniqueIssues.filter(i => i.status === 'resolved').length})
              </button>
              <button
                type="button"
                id="feed-tab-history"
                onClick={() => setFeedTab('history')}
                className={`py-2 text-[10px] font-extrabold rounded-xl transition-all uppercase tracking-wider cursor-pointer ${
                  feedTab === 'history'
                    ? 'bg-brand-primary text-white shadow-brand-sm'
                    : 'text-brand-text-sub hover:text-brand-text-main'
                }`}
              >
                History ({uniqueIssues.filter(i => i.status === 'closed' || i.status === 'archived').length})
              </button>
              <button
                type="button"
                id="feed-tab-users"
                onClick={() => setFeedTab('users')}
                className={`py-2 text-[10px] font-extrabold rounded-xl transition-all uppercase tracking-wider cursor-pointer ${
                  feedTab === 'users'
                    ? 'bg-brand-primary text-white shadow-brand-sm'
                    : 'text-brand-text-sub hover:text-brand-text-main'
                }`}
              >
                Users Registry
              </button>
            </div>

            {/* Multi-selection info and action bar */}
            {filteredIssues.length > 0 && (
              <div className="flex justify-between items-center bg-brand-bg border border-brand-border rounded-2xl px-4 py-2 mb-3 text-[11px] font-bold">
                <span className="text-brand-text-sub">
                  Selected: {selectedIssueIds.length} / {filteredIssues.length}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedIssueIds.length === filteredIssues.length) {
                      setSelectedIssueIds([]);
                    } else {
                      setSelectedIssueIds(filteredIssues.map(i => i.id));
                    }
                  }}
                  className="text-brand-primary hover:text-brand-primary/80 uppercase tracking-wider transition-colors text-[10px] font-extrabold"
                >
                  {selectedIssueIds.length === filteredIssues.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            )}

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {filteredIssues.length === 0 ? (
                <div className="text-center py-8 text-brand-text-sub text-xs">
                  No tickets in this section.
                </div>
              ) : (
                filteredIssues.map((issue) => {
                  const isActive = issue.id === selectedIssueId;
                  const isSelected = selectedIssueIds.includes(issue.id);
                  const isUrgent = issue.severity === 'urgent';
                  const labelColor = isUrgent ? 'text-brand-danger bg-brand-danger/10 border border-brand-danger/20' :
                                     issue.severity === 'high' ? 'text-brand-warning bg-brand-warning/10 border border-brand-warning/20' :
                                     'text-brand-text-sub bg-brand-bg border border-brand-border';
                  
                  return (
                    <div
                      key={issue.id}
                      className={`relative w-full p-4 border rounded-2xl transition-all flex gap-3 items-center ${
                        isActive 
                          ? 'bg-brand-primary-light border-brand-primary shadow-brand-sm' 
                          : 'bg-brand-card border-brand-border hover:bg-brand-bg/50'
                      }`}
                    >
                      {/* Custom Checkbox */}
                      <div className="flex items-center flex-shrink-0 cursor-pointer pl-1 pr-1 py-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isSelected) {
                            setSelectedIssueIds(prev => prev.filter(id => id !== issue.id));
                          } else {
                            setSelectedIssueIds(prev => [...prev, issue.id]);
                          }
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className="w-4.5 h-4.5 rounded border-brand-border text-brand-primary focus:ring-brand-primary cursor-pointer accent-brand-primary"
                        />
                      </div>

                      {/* Clickable Card Body */}
                      <div 
                        onClick={() => {
                          setSelectedIssueId(issue.id);
                          setShowRejectModal(false);
                        }}
                        className="flex-1 flex gap-3 cursor-pointer min-w-0 items-center"
                      >
                        {/* Tiny Image Thumbnail */}
                        <img 
                          src={issue.image} 
                          alt="" 
                          className="w-11 h-11 object-cover rounded-xl shadow-brand-sm flex-shrink-0"
                          referrerPolicy="no-referrer"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md border ${labelColor}`}>
                              {issue.severity}
                            </span>
                            <span className="text-[9px] text-brand-text-sub capitalize truncate max-w-[80px] font-mono font-bold">
                              {issue.status === 'resolved' ? 'RESOLVED (PENDING)' : issue.status.replace('_', ' ')}
                            </span>
                          </div>

                          <h4 className="font-bold text-xs text-brand-text-main mt-1 truncate">
                            {issue.title}
                          </h4>
                          <p className="text-[10px] text-brand-text-sub mt-0.5 font-mono">
                            {issue.department.split(' ')[0]} Div • SLA {issue.repairTime}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Officer Standings Registry */}
          <div className="bg-brand-card border border-brand-border p-5 rounded-3xl shadow-brand-sm">
            <span className="text-xs font-bold text-brand-text-sub uppercase tracking-widest block mb-4">Service Crew Rankings</span>
            <div className="space-y-3.5">
              {officersPool.map((officer, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-bold font-mono text-brand-text-sub w-4">#{index+1}</span>
                    <div>
                      <span className="font-bold text-brand-text-main block">{officer.name}</span>
                      <span className="text-[10px] text-brand-text-sub block mt-0.5">{officer.dept}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-brand-success block">{officer.resolved} Fixed</span>
                    <span className="text-[10px] text-brand-text-sub block mt-0.5">⭐ {officer.rating} • SLA {officer.avgTime}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center/Right 2 Columns: Selected Issue Operations Details */}
        {activeIssue ? (
          <div className="lg:col-span-2 space-y-6">
            
            {/* Bulk Operations Panel */}
            {selectedIssueIds.length > 0 && (
              <div className="bg-brand-card border-2 border-brand-primary p-6 rounded-3xl shadow-brand-lg space-y-6 animate-fadeIn">
                <div className="flex justify-between items-start border-b border-brand-border pb-4">
                  <div>
                    <div className="flex items-center gap-2 text-brand-primary">
                      <Sparkles className="w-5 h-5 animate-pulse" />
                      <span className="text-[11px] font-mono font-extrabold uppercase tracking-widest">Administrative Command Center</span>
                    </div>
                    <h3 className="text-xl font-bold font-display text-brand-text-main mt-1">
                      Bulk Operations Panel
                    </h3>
                    <p className="text-xs text-brand-text-sub mt-1">
                      Simultaneously dispatch, modify, or verify <strong className="text-brand-primary font-extrabold">{selectedIssueIds.length} selected tickets</strong> at once.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedIssueIds([])}
                    className="p-1 text-brand-text-sub hover:text-brand-text-main bg-brand-bg rounded-xl border border-brand-border cursor-pointer transition-all"
                    title="Clear Selection"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Part 1: Bulk Status Action */}
                  <div className="bg-brand-bg p-5 rounded-2xl border border-brand-border flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-brand-text-main flex items-center gap-1.5 mb-3">
                        <Zap className="w-4.5 h-4.5 text-brand-primary" />
                        <span>1. Bulk Status Update</span>
                      </h4>
                      <p className="text-[11px] text-brand-text-sub mb-4">
                        Transition all selected tickets to a new workflow status with an optional custom administrative audit log comment.
                      </p>

                      <div className="space-y-3.5">
                        <div>
                          <label className="text-[10px] font-bold text-brand-text-sub uppercase tracking-wider block mb-1.5">
                            Status Log Note / Audit Comment
                          </label>
                          <input
                            type="text"
                            value={bulkStatusNote}
                            onChange={(e) => setBulkStatusNote(e.target.value)}
                            placeholder="e.g., Bulk repairs completed, crews cleared site."
                            className="w-full px-3.5 py-2 text-xs bg-brand-card border border-brand-border rounded-xl focus:border-brand-primary focus:outline-none text-brand-text-main placeholder-brand-text-sub/50"
                          />
                        </div>

                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-brand-text-sub uppercase tracking-wider block">
                            Select Target Status to Transition:
                          </span>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => handleBulkStatusChange('reported', bulkStatusNote)}
                              className="px-3 py-2 bg-brand-card hover:bg-brand-bg text-[11px] font-extrabold text-brand-text-main border border-brand-border rounded-xl cursor-pointer hover:border-brand-primary transition-all text-center"
                            >
                              Reported (Reset)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleBulkStatusChange('in_progress', bulkStatusNote)}
                              className="px-3 py-2 bg-brand-primary-light hover:bg-brand-primary/10 text-[11px] font-extrabold text-brand-primary border border-brand-primary/20 rounded-xl cursor-pointer hover:border-brand-primary transition-all text-center"
                            >
                              Start Repairs
                            </button>
                            <button
                              type="button"
                              onClick={() => handleBulkStatusChange('resolved', bulkStatusNote)}
                              className="px-3 py-2 bg-brand-success/10 hover:bg-brand-success/20 text-[11px] font-extrabold text-brand-success border border-brand-success/20 rounded-xl cursor-pointer hover:border-brand-success transition-all text-center"
                            >
                              Mark Resolved
                            </button>
                            <button
                              type="button"
                              onClick={() => handleBulkStatusChange('closed', bulkStatusNote)}
                              className="px-3 py-2 bg-brand-bg hover:bg-brand-border text-[11px] font-extrabold text-brand-text-sub hover:text-brand-text-main border border-brand-border rounded-xl cursor-pointer transition-all text-center"
                            >
                              Approve & Close
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Part 2: Bulk Assign Officer */}
                  <form onSubmit={handleBulkAssignOfficerSubmit} className="bg-brand-bg p-5 rounded-2xl border border-brand-border flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-brand-text-main flex items-center gap-1.5 mb-3">
                        <UserCheck className="w-4.5 h-4.5 text-brand-primary" />
                        <span>2. Bulk Officer Assignment</span>
                      </h4>
                      <p className="text-[11px] text-brand-text-sub mb-4">
                        Mobilize a service crew or custom auditor for all selected tickets. Suggested repair equipment and budget will be allocated automatically.
                      </p>

                      <div className="space-y-3.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-brand-text-sub uppercase tracking-wider block">
                            Assigned Service Crew
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsBulkCustomOfficer(!isBulkCustomOfficer)}
                            className="text-[10px] text-brand-primary font-bold hover:underline cursor-pointer uppercase tracking-wider"
                          >
                            {isBulkCustomOfficer ? 'Select From Pool' : 'Register Custom'}
                          </button>
                        </div>

                        {!isBulkCustomOfficer ? (
                          <div>
                            <select
                              value={bulkAssigneeName}
                              onChange={(e) => setBulkAssigneeName(e.target.value)}
                              className="w-full px-3.5 py-2.5 text-xs bg-brand-card border border-brand-border rounded-xl focus:border-brand-primary focus:outline-none text-brand-text-main cursor-pointer"
                              required
                            >
                              <option value="">-- Choose Dispatch Officer --</option>
                              {officersPool.map((officer) => (
                                <option key={officer.name} value={officer.name}>
                                  {officer.name} ({officer.dept})
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            <div>
                              <input
                                type="text"
                                placeholder="Officer Name"
                                value={bulkCustomName}
                                onChange={(e) => setBulkCustomName(e.target.value)}
                                className="w-full px-3.5 py-1.5 text-xs bg-brand-card border border-brand-border rounded-xl focus:border-brand-primary focus:outline-none text-brand-text-main"
                                required={isBulkCustomOfficer}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                placeholder="Department"
                                value={bulkCustomDept}
                                onChange={(e) => setBulkCustomDept(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs bg-brand-card border border-brand-border rounded-xl focus:border-brand-primary focus:outline-none text-brand-text-main"
                              />
                              <input
                                type="text"
                                placeholder="Role/Title"
                                value={bulkCustomRole}
                                onChange={(e) => setBulkCustomRole(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs bg-brand-card border border-brand-border rounded-xl focus:border-brand-primary focus:outline-none text-brand-text-main"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full mt-4 py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white font-extrabold text-xs rounded-xl shadow-brand-sm hover:shadow-brand-md transition-all transform active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Dispatch and Assign to All</span>
                    </button>
                  </form>
                </div>
              </div>
            )}
            
            {/* Top Operational Status Summary */}
            <div className="bg-brand-card border border-brand-border p-6 rounded-3xl shadow-brand-md space-y-5">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-brand-border pb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-brand-text-sub uppercase">Selected Incident Details</span>
                  <h2 className="text-2xl font-bold font-display text-brand-text-main mt-1">{activeIssue.title}</h2>
                </div>

                {/* Auto Escalate & Reject trigger */}
                <div className="flex gap-2">
                  <button
                    id="escalate-trigger-btn"
                    onClick={handleEscalateIssue}
                    disabled={activeIssue.severity === 'urgent'}
                    className="px-3.5 py-2 border border-brand-danger/20 hover:border-brand-danger text-brand-danger hover:bg-brand-danger/10 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Auto Escalate</span>
                  </button>

                  <button
                    id="reject-trigger-btn"
                    onClick={() => setShowRejectModal(true)}
                    className="px-3.5 py-2 border border-brand-border hover:border-brand-primary text-brand-text-sub hover:text-brand-primary rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span>Approve / Reject</span>
                  </button>
                </div>
              </div>

              {/* AI Auto Priority Assignment diagnostics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-brand-bg p-4 rounded-2xl border border-brand-border">
                <div>
                  <span className="text-[10px] text-brand-text-sub uppercase font-bold tracking-wider block">AI Priority Level</span>
                  <span className="text-sm font-bold text-brand-primary mt-1 block">
                    {getPriorityLevel(activeIssue.severity)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-brand-text-sub uppercase font-bold tracking-wider block">Suggested Officer Expert</span>
                  <span className="text-sm font-bold text-brand-text-main mt-1 block">
                    {activeIssue.type === 'electricity' ? 'Grid Electrician' :
                     activeIssue.type === 'water_leak' ? 'Hydraulic Engineer' :
                     activeIssue.type === 'pothole' ? 'Civil Paving Engineer' : 'Sanitation Crew'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-brand-text-sub uppercase font-bold tracking-wider block">Estimated Hours SLA</span>
                  <span className="text-sm font-bold text-brand-warning mt-1 block">
                    {activeIssue.repairTime} Max Limit
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Action Tabs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Action 1: Assign Officer */}
              <div className="bg-brand-card border border-brand-border p-6 rounded-3xl shadow-brand-sm">
                <h3 className="font-bold text-brand-text-main text-base mb-4 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-brand-text-sub" />
                  <span>Assign Operations Personnel</span>
                </h3>

                {activeIssue.assignedOfficer ? (
                  <div className="p-4 bg-brand-success/10 border border-brand-success/20 rounded-2xl flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] text-brand-success font-bold block">ACTIVE OFFICER DISPATCHED</span>
                      <span className="text-sm font-bold text-brand-text-main mt-0.5 block">{activeIssue.assignedOfficer.name}</span>
                      <span className="text-xs text-brand-text-sub mt-0.5 block">{activeIssue.assignedOfficer.dept}</span>
                    </div>
                    <button
                      onClick={() => {
                        const updated: Issue = { ...activeIssue, assignedOfficer: null };
                        onUpdateIssue(updated);
                      }}
                      className="text-xs text-brand-danger font-bold hover:underline cursor-pointer"
                    >
                      Reassign
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleAssignOfficer} className="space-y-4">
                    {/* Toggle between Registered and Custom */}
                    <div className="flex bg-brand-bg p-1 rounded-xl border border-brand-border gap-1 mb-2">
                      <button
                        type="button"
                        onClick={() => setIsCustomOfficer(false)}
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg uppercase cursor-pointer transition-all ${
                          !isCustomOfficer 
                            ? 'bg-brand-primary text-white shadow-brand-sm' 
                            : 'text-brand-text-sub hover:text-brand-text-main hover:bg-brand-card'
                        }`}
                      >
                        Registered Officers
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCustomOfficer(true)}
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg uppercase cursor-pointer transition-all ${
                          isCustomOfficer 
                            ? 'bg-brand-primary text-white shadow-brand-sm' 
                            : 'text-brand-text-sub hover:text-brand-text-main hover:bg-brand-card'
                        }`}
                      >
                        Assign Custom Officer
                      </button>
                    </div>

                    {!isCustomOfficer ? (
                      <div>
                        <label className="text-xs text-brand-text-sub block mb-2">Select Active Regional Officer</label>
                        <select
                          id="officer-select"
                          value={assigneeName}
                          onChange={(e) => setAssigneeName(e.target.value)}
                          className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-xl text-sm text-brand-text-main focus:outline-hidden focus:border-brand-primary cursor-pointer"
                          required={!isCustomOfficer}
                        >
                          <option value="">-- Choose Officer --</option>
                          {officersPool.map((off, idx) => (
                            <option key={idx} value={off.name}>
                              {off.name} ({off.dept})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-brand-text-sub block mb-1">Officer / Crew Name</label>
                          <input
                            type="text"
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value)}
                            placeholder="e.g. Officer Rohan Deshmukh"
                            className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-xl text-sm text-brand-text-main focus:outline-hidden focus:border-brand-primary"
                            required={isCustomOfficer}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-brand-text-sub block mb-1">Department Division</label>
                          <input
                            type="text"
                            value={customDept}
                            onChange={(e) => setCustomDept(e.target.value)}
                            placeholder="e.g. Pune Municipal Corporation (PMC)"
                            className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-xl text-sm text-brand-text-main focus:outline-hidden focus:border-brand-primary"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-brand-text-sub block mb-1">Designation / Role</label>
                          <input
                            type="text"
                            value={customRole}
                            onChange={(e) => setCustomRole(e.target.value)}
                            placeholder="e.g. Lead Sanitation Supervisor"
                            className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-xl text-sm text-brand-text-main focus:outline-hidden focus:border-brand-primary"
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      id="assign-officer-btn"
                      className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold text-xs rounded-xl shadow-brand-sm cursor-pointer transition-colors"
                    >
                      Disburse Patrol Officer
                    </button>
                  </form>
                )}
              </div>

              {/* Action 2: Deploy Inspection Team */}
              <div className="bg-brand-card border border-brand-border p-6 rounded-3xl shadow-brand-sm">
                <h3 className="font-bold text-brand-text-main text-base mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-brand-text-sub" />
                  <span>On-Site Verification Audit</span>
                </h3>

                {activeIssue.inspectionReport ? (
                  <div className="p-4 bg-brand-bg border border-brand-border rounded-2xl space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-brand-text-sub">Status Verification:</span>
                      <span className="font-bold uppercase text-brand-success">{activeIssue.inspectionReport.verifiedStatus}</span>
                    </div>
                    <p className="text-xs text-brand-text-sub italic">"{activeIssue.inspectionReport.notes}"</p>
                    <span className="text-[10px] text-brand-text-sub block text-right">Signed: {activeIssue.inspectionReport.inspectorName}</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-brand-text-sub block mb-2">Inspection Notes / Dimensions</label>
                      <textarea
                        rows={2}
                        id="inspection-notes"
                        value={inspectionNotes}
                        onChange={(e) => setInspectionNotes(e.target.value)}
                        placeholder="Verify damage size, grid leakage level, safety fencing status..."
                        className="w-full px-4 py-2 bg-brand-bg border border-brand-border rounded-xl text-xs focus:outline-hidden focus:border-brand-primary text-brand-text-main"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => handleDeployInspection('valid')}
                        className="py-2 bg-brand-success/10 hover:bg-brand-success/20 border border-brand-success/20 text-brand-success text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                      >
                        ✔ Valid
                      </button>
                      <button
                        onClick={() => handleDeployInspection('resolved_already')}
                        className="py-2 bg-brand-primary-light hover:bg-brand-primary-light/80 border border-brand-primary/20 text-brand-primary text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                      >
                        ✔ Fixed Already
                      </button>
                      <button
                        onClick={() => handleDeployInspection('invalid')}
                        className="py-2 bg-brand-danger/10 hover:bg-brand-danger/20 border border-brand-danger/20 text-brand-danger text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                      >
                        ❌ Invalid / Fake
                      </button>
                    </div>
                  </div>
                )}
                </div>
              </div>

              {/* Verify & Confirm Work Completion Banner */}
              <div className="bg-brand-card border border-brand-border p-6 rounded-3xl shadow-brand-sm">
              {activeIssue.status !== 'resolved' && activeIssue.status !== 'closed' && activeIssue.status !== 'archived' ? (
                <div className="bg-brand-success/10 border border-brand-success/20 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="space-y-1 text-center sm:text-left">
                    <h3 className="font-extrabold text-brand-success text-base flex items-center justify-center sm:justify-start gap-1.5">
                      <Check className="w-5 h-5 animate-pulse" />
                      <span>Verify & Confirm Work Completion</span>
                    </h3>
                    <p className="text-xs text-brand-text-sub">
                      Click below to officially verify repairs are finished, restore standards, and set status to Resolved (Pending Verification).
                    </p>
                  </div>
                  <button
                    type="button"
                    id="confirm-work-done-btn"
                    onClick={() => handleStatusChange('resolved', 'Official verification complete. Work certified as successfully finished, pending administrative review.')}
                    className="px-6 py-3 bg-brand-success hover:bg-brand-success/90 text-white font-extrabold text-sm rounded-xl shadow-brand-sm hover:shadow-brand-md transition-all transform active:scale-95 flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center"
                  >
                    <Check className="w-4.5 h-4.5" />
                    <span>Confirm Work is Done</span>
                  </button>
                </div>
              ) : activeIssue.status === 'resolved' ? (
                <div className="bg-brand-primary-light border border-brand-primary/30 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="space-y-1 text-center sm:text-left">
                    <h3 className="font-extrabold text-brand-primary text-base flex items-center justify-center sm:justify-start gap-1.5">
                      <ShieldCheck className="w-5 h-5 animate-pulse" />
                      <span>Admin Verification Enforced</span>
                    </h3>
                    <p className="text-xs text-brand-text-sub">
                      Repairs completed by on-site crew. Administrative verification and approval is mandatory to close this ticket.
                    </p>
                  </div>
                  <button
                    type="button"
                    id="admin-verify-close-btn"
                    onClick={() => handleStatusChange('closed', 'Admin Auditor officially verified repairs and closed the ticket.')}
                    className="px-6 py-3 bg-brand-primary hover:bg-brand-primary/90 text-white font-extrabold text-sm rounded-xl shadow-brand-sm hover:shadow-brand-md transition-all transform active:scale-95 flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center"
                  >
                    <ShieldCheck className="w-4.5 h-4.5" />
                    <span>Approve & Close Ticket</span>
                  </button>
                </div>
              ) : (
                <div className="bg-brand-success/15 border border-brand-success/30 p-5 rounded-2xl flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-brand-success/20 flex items-center justify-center text-brand-success flex-shrink-0">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-brand-success text-sm">Work Verified & Completed</h3>
                    <p className="text-[11px] text-brand-text-sub mt-0.5">
                      This incident has been fully resolved, approved, and closed by the Admin Audit desk. No further action is required.
                    </p>
                  </div>
                </div>
              )}
            </div>
 
            {/* Operational Workflow status bar selector */}
            <div className="bg-brand-card border border-brand-border p-6 rounded-3xl shadow-brand-sm">
              <h3 className="font-bold text-brand-text-main mb-4">Advance Work Order Status</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { status: 'reported', label: 'Reported', note: 'Reverted work order back to reported queue.' },
                  { status: 'assigned', label: 'Assign Crew', note: 'Crews successfully mobilised for response.' },
                  { status: 'in_progress', label: 'Start Repairs', note: 'Heavy repair machinery is active on coordinate.' },
                  { status: 'resolved', label: 'Mark Resolved', note: 'Issue fully resolved, pending administrative audit review.' }
                ].map((st, idx) => {
                  const isActive = activeIssue.status === st.status;
                  return (
                    <button
                      key={idx}
                      id={`status-order-${st.status}`}
                      onClick={() => handleStatusChange(st.status as IssueStatus, st.note)}
                      className={`py-3 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                        isActive 
                          ? 'bg-brand-primary text-white border-brand-primary shadow-brand-sm' 
                          : 'bg-brand-bg text-brand-text-sub border-brand-border hover:bg-brand-card hover:text-brand-text-main'
                      }`}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Resource allocation config */}
            <div className="bg-brand-card border border-brand-border p-6 rounded-3xl shadow-brand-sm">
              <h3 className="font-bold text-brand-text-main text-base mb-4 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-brand-text-sub" />
                <span>Adjust Resource Allocation</span>
              </h3>

              <form onSubmit={handleUpdateResources} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-brand-text-sub block mb-2">Assigned Budget (₹)</label>
                  <input
                    type="number"
                    value={assignedBudgetInput}
                    onChange={(e) => setAssignedBudgetInput(e.target.value)}
                    placeholder="e.g. 100000"
                    className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-xl text-xs font-bold text-brand-text-main focus:outline-hidden focus:border-brand-primary"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-brand-text-sub block mb-2">Spent Budget (₹)</label>
                  <input
                    type="number"
                    value={spentBudgetInput}
                    onChange={(e) => setSpentBudgetInput(e.target.value)}
                    placeholder="e.g. 45000"
                    className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-xl text-xs font-bold text-brand-text-main focus:outline-hidden focus:border-brand-primary"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-brand-text-sub block mb-2">Crews Dispatched</label>
                  <input
                    type="number"
                    value={teamsCount}
                    onChange={(e) => setTeamsCount(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-xl text-xs font-bold text-brand-text-main focus:outline-hidden focus:border-brand-primary"
                    required
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    id="update-resources-btn"
                    className="w-full py-3 bg-brand-text-main hover:bg-brand-text-main/95 text-brand-card font-bold text-xs rounded-xl shadow-brand-sm cursor-pointer transition-colors"
                  >
                    Confirm Resources
                  </button>
                </div>

                {/* Equipment Checkboxes */}
                <div className="md:col-span-3">
                  <span className="text-xs text-brand-text-sub block mb-3">Deploy Equipment Assets:</span>
                  <div className="flex flex-wrap gap-2">
                    {equipmentList.map((eq, eqIdx) => {
                      const selected = selectedEquipment.includes(eq) || activeIssue.resourceAllocation?.equipment.includes(eq);
                      return (
                        <button
                          type="button"
                          key={eqIdx}
                          onClick={() => handleEquipmentToggle(eq)}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-semibold border transition-all cursor-pointer ${
                            selected 
                              ? 'bg-brand-primary-light text-brand-primary border-brand-primary shadow-brand-sm' 
                              : 'bg-brand-card text-brand-text-sub border-brand-border hover:border-brand-text-main'
                          }`}
                        >
                          {eq}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 bg-brand-bg rounded-3xl p-12 text-center flex flex-col items-center justify-center min-h-[400px] border border-brand-border">
            <Bot className="w-12 h-12 text-brand-text-sub animate-pulse mb-3" />
            <h4 className="font-bold text-brand-text-main">No Incidents Loaded</h4>
            <p className="text-xs text-brand-text-sub mt-1 max-w-xs">
              Select an ongoing citizen report from the operational feed to initiate dispatch routines.
            </p>
          </div>
        )}
        </div>
      )}

      {/* Reject Reason Modal Overlay */}
      {showRejectModal && activeIssue && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-brand-card border border-brand-border rounded-3xl p-6 w-full max-w-md shadow-brand-lg">
            <h3 className="text-xl font-bold text-brand-text-main mb-2">Audit Decision Form</h3>
            <p className="text-xs text-brand-text-sub mb-4">
              Specify the rationale for closing or rejecting work order reference: "{activeIssue.title}".
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-brand-text-sub block mb-2">Audit Reason / Rationale</label>
                <select
                  id="reject-reason-select"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-xl text-xs text-brand-text-main focus:outline-hidden"
                  required
                >
                  <option value="">-- Choose Audit Reason --</option>
                  <option value="Duplicate: Already merged with active Connaught Place work order">Duplicate of active Connaught Place order</option>
                  <option value="Fake report: Image upload classified as simulated/irrelevant">Fake report / Irrelevant photo</option>
                  <option value="Resolved already: Maintenance logs confirm resolved yesterday">Resolved already by routine crews</option>
                  <option value="Deferred: Not a municipal asset concern">Deferred / Private asset concern</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2.5 border border-brand-border text-brand-text-sub rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="reject-confirm-btn"
                  className="px-4 py-2.5 bg-brand-danger hover:bg-brand-danger/90 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Confirm Reject / Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
