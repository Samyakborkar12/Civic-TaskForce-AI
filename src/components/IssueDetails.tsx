import React, { useState } from 'react';
import { Issue, IssueStatus } from '../types';
import { translations } from '../mockData';
import { ArrowLeft, CheckCircle2, AlertTriangle, ShieldCheck, ThumbsUp, MapPin, User as UserIcon, Calendar, Clock, ShieldAlert, Award } from 'lucide-react';

interface IssueDetailsProps {
  lang: 'en' | 'es' | 'hi' | 'ja' | 'mr';
  issue: Issue;
  currentUser: { name: string; email: string } | null;
  onBack: () => void;
  onVerify: (issueId: string, email: string) => void;
  onUpvote: (issueId: string) => void;
}

export default function IssueDetails({ lang, issue, currentUser, onBack, onVerify, onUpvote }: IssueDetailsProps) {
  const t = translations[lang];
  const [justVerified, setJustVerified] = useState(false);

  const steps: { label: string; status: IssueStatus }[] = [
    { label: 'Reported', status: 'reported' },
    { label: 'Under Review', status: 'ai_analyzed' },
    { label: 'Assigned', status: 'assigned' },
    { label: 'In Progress', status: 'in_progress' },
    { label: 'Resolved (Pending Verification)', status: 'resolved' },
    { label: 'Closed', status: 'closed' },
    { label: 'Archived', status: 'archived' }
  ];

  // Helper to determine active step index
  const getActiveStepIndex = (status: IssueStatus) => {
    return steps.findIndex(s => s.status === status);
  };

  const activeIdx = getActiveStepIndex(issue.status);

  // Check if current user has already verified
  const userHasVerified = currentUser && issue.verifiedBy.includes(currentUser.email);

  const handleVerifyClick = () => {
    if (!currentUser || userHasVerified) return;
    onVerify(issue.id, currentUser.email);
    setJustVerified(true);
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'urgent': return 'bg-brand-danger/10 text-brand-danger border-brand-danger/20';
      case 'high': return 'bg-brand-warning/10 text-brand-warning border-brand-warning/20';
      case 'medium': return 'bg-brand-warning/10 text-brand-warning border-brand-warning/20';
      default: return 'bg-brand-success/10 text-brand-success border-brand-success/20';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-brand-text-sub hover:text-brand-text-main mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Image, Description, Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Info Card */}
          <div className="bg-brand-card border border-brand-border rounded-3xl overflow-hidden shadow-brand-sm">
            <div className="relative h-[280px]">
              <img 
                src={issue.image} 
                alt={issue.title} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent"></div>
              
              {/* Badge Overlay */}
              <div className="absolute top-4 left-4 flex gap-2">
                <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full border ${getSeverityStyles(issue.severity)}`}>
                  {issue.severity} Severity
                </span>
                {issue.isEmergency && (
                  <span className="px-3 py-1 text-xs font-bold uppercase rounded-full bg-brand-danger text-white animate-pulse shadow-brand-md">
                    Emergency Mode
                  </span>
                )}
              </div>

              {/* Title & Metadata Overlay */}
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <h1 className="text-2xl sm:text-3xl font-display font-bold leading-tight">{issue.title}</h1>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm opacity-90">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-brand-primary" />
                    <span>Connaught Place Block, New Delhi</span>
                  </span>
                  <span>•</span>
                  <span>Reported by {issue.reporterName}</span>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Description */}
              <div>
                <h3 className="font-bold text-brand-text-main text-base">Issue Assessment</h3>
                <p className="mt-2 text-sm text-brand-text-sub leading-relaxed">
                  {issue.description}
                </p>
              </div>

              {/* Interactive verification action */}
              {issue.status !== 'resolved' && issue.status !== 'closed' && (
                <div className="p-5 bg-brand-primary-light border border-brand-primary/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-sm text-brand-text-main">{t.citizenFeedback}</h4>
                    <p className="text-xs text-brand-text-sub mt-1">
                      Are you near this site? Upvote or confirm to raise municipal priority levels!
                    </p>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      id="upvote-issue-btn"
                      onClick={() => onUpvote(issue.id)}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-brand-card border border-brand-border hover:border-brand-primary hover:text-brand-primary text-brand-text-main rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-brand-sm transition-colors"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span>Upvote ({issue.upvotes})</span>
                    </button>

                    <button
                      id="verify-issue-btn"
                      onClick={handleVerifyClick}
                      disabled={!currentUser || userHasVerified || justVerified}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-brand-primary hover:bg-brand-primary/90 disabled:bg-brand-success disabled:text-white disabled:pointer-events-none text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-brand-sm transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>
                        {userHasVerified || justVerified ? t.alreadyVerified : t.verifyThisIssue}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Workflow Status Tracker */}
          <div className="bg-brand-card border border-brand-border p-6 rounded-3xl shadow-brand-sm">
            <h3 className="font-bold text-brand-text-main mb-6">Transparency Progression Tracker</h3>
            
            <div className="relative">
              {/* Vertical line connector */}
              <div className="absolute left-[13px] top-2 bottom-2 w-0.5 bg-brand-border"></div>

              <div className="space-y-6 relative">
                {steps.map((step, idx) => {
                  const isDone = idx <= activeIdx;
                  const isCurrent = idx === activeIdx;
                  
                  return (
                    <div key={idx} className="flex items-start gap-4">
                      {/* Circle node */}
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 z-10 flex-shrink-0 ${
                        isCurrent 
                          ? 'bg-brand-primary border-brand-primary text-white animate-pulse' 
                          : isDone 
                            ? 'bg-brand-success border-brand-success text-white' 
                            : 'bg-brand-card border-brand-border text-brand-text-sub/40'
                      }`}>
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <span className="text-[10px] font-bold font-mono">{idx + 1}</span>
                        )}
                      </div>

                      {/* Text */}
                      <div className="pt-0.5">
                        <span className={`text-sm font-bold ${
                          isCurrent ? 'text-brand-primary' :
                          isDone ? 'text-brand-text-main' : 'text-brand-text-sub'
                        }`}>
                          {step.label}
                        </span>
                        
                        {/* Inline subtext if current step */}
                        {isCurrent && (
                          <p className="text-xs text-brand-primary mt-1">
                            Current phase. Crews and departments actively executing tasks.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Activity Logs Timeline */}
          <div className="bg-brand-card border border-brand-border p-6 rounded-3xl shadow-brand-sm">
            <h3 className="font-bold text-brand-text-main mb-6">Operational Audit Timeline</h3>
            <div className="space-y-4">
              {issue.timeline.map((event, idx) => (
                <div key={idx} className="p-4 bg-brand-bg rounded-2xl border border-brand-border">
                  <div className="flex items-center justify-between text-xs font-semibold text-brand-text-sub mb-1">
                    <span className="capitalize text-brand-primary">{event.status.replace('_', ' ')}</span>
                    <span>{new Date(event.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                  <p className="text-xs text-brand-text-main font-medium leading-relaxed">{event.note}</p>
                  <span className="text-[10px] text-brand-text-sub block mt-2">Actor: {event.actor}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: AI Routing & Officer Info */}
        <div className="space-y-6">
          {/* AI Diagnostic card */}
          <div className="bg-brand-card border border-brand-border p-6 rounded-3xl shadow-brand-sm text-center">
            <ShieldAlert className="w-10 h-10 text-brand-primary mx-auto mb-4 animate-pulse" />
            <h3 className="font-bold text-brand-text-main">AI Diagnostic Routing</h3>
            
            <div className="mt-4 space-y-4 text-left">
              <div className="flex justify-between items-center text-xs border-b border-brand-border pb-2">
                <span className="text-brand-text-sub">Public Risk Index</span>
                <span className="font-mono font-bold text-brand-primary">{issue.riskScore}/100</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-brand-border pb-2">
                <span className="text-brand-text-sub">Classification Confidence</span>
                <span className="font-mono font-bold text-brand-success">{issue.confidence}%</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-brand-border pb-2">
                <span className="text-brand-text-sub">Target Department</span>
                <span className="font-bold text-brand-text-main max-w-[150px] truncate text-right">{issue.department}</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-1">
                <span className="text-brand-text-sub">Resolution S.L.A.</span>
                <span className="font-bold text-brand-warning">{issue.repairTime}</span>
              </div>
            </div>
          </div>

          {/* Assigned Officer Card */}
          {issue.assignedOfficer ? (
            <div className="bg-brand-card border border-brand-border p-6 rounded-3xl shadow-brand-sm">
              <h3 className="font-bold text-brand-text-main mb-4">Assigned Service Personnel</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-brand-primary-light rounded-2xl flex items-center justify-center text-brand-primary font-bold text-lg">
                  {issue.assignedOfficer.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-brand-text-main">{issue.assignedOfficer.name}</h4>
                  <span className="text-xs text-brand-text-sub block mt-0.5">{issue.assignedOfficer.role}</span>
                </div>
              </div>

              <div className="space-y-2 text-xs border-t border-brand-border pt-4">
                <div className="flex items-center justify-between text-brand-text-sub">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-brand-text-sub" />
                    <span>Completion Deadline:</span>
                  </span>
                  <span className="font-semibold text-brand-text-main">
                    {new Date(issue.assignedOfficer.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-brand-text-sub mt-2">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-brand-text-sub" />
                    <span>Resolution Time SLA:</span>
                  </span>
                  <span className="font-semibold text-brand-warning">
                    {issue.repairTime}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-brand-card border border-brand-border p-6 rounded-3xl shadow-brand-sm text-center py-8">
              <UserIcon className="w-8 h-8 text-brand-text-sub mx-auto mb-3" />
              <h4 className="font-bold text-sm text-brand-text-main">Officer Assignment Pending</h4>
              <p className="text-xs text-brand-text-sub mt-1 max-w-[200px] mx-auto">
                Municipal dispatch is currently auditing resources and assigning the optimal crew.
              </p>
            </div>
          )}

          {/* Allocation of Public Resources */}
          {issue.resourceAllocation && (
            <div className="bg-brand-card border border-brand-border p-6 rounded-3xl shadow-brand-sm">
              <h3 className="font-bold text-brand-text-main mb-4">Resource & Equipment Alloc</h3>
              <div className="space-y-4 text-xs">
                <div className="flex justify-between border-b border-brand-border pb-2">
                  <span className="text-brand-text-sub">Deployed Crews</span>
                  <span className="font-bold text-brand-text-main">{issue.resourceAllocation.teams} Dispatch Team</span>
                </div>
                <div className="flex justify-between border-b border-brand-border pb-2">
                  <span className="text-brand-text-sub">Assigned Budget</span>
                  <span className="font-bold text-brand-text-main">
                    ₹{(issue.resourceAllocation.assignedBudget ?? 10000).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between border-b border-brand-border pb-2">
                  <span className="text-brand-text-sub">Spent Budget</span>
                  <span className="font-bold text-brand-success">
                    ₹{(issue.resourceAllocation.spentBudget ?? 0).toLocaleString('en-IN')}
                  </span>
                </div>
                {issue.resourceAllocation.assignedBudget && issue.resourceAllocation.assignedBudget > 0 ? (
                  <div className="border-b border-brand-border pb-2">
                    <div className="flex justify-between text-[10px] text-brand-text-sub mb-1">
                      <span>Budget Spent %</span>
                      <span className="font-mono font-bold">
                        {Math.round(((issue.resourceAllocation.spentBudget ?? 0) / (issue.resourceAllocation.assignedBudget ?? 1)) * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-brand-bg rounded-full overflow-hidden border border-brand-border">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          ((issue.resourceAllocation.spentBudget ?? 0) / issue.resourceAllocation.assignedBudget) > 0.9 
                            ? 'bg-red-500' 
                            : 'bg-brand-primary'
                        }`}
                        style={{ width: `${Math.min(100, Math.round(((issue.resourceAllocation.spentBudget ?? 0) / issue.resourceAllocation.assignedBudget) * 100))}%` }}
                      ></div>
                    </div>
                  </div>
                ) : null}
                <div>
                  <span className="text-brand-text-sub block mb-2">Assigned Heavy Equipment:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {issue.resourceAllocation.equipment.map((eq, eqIdx) => (
                      <span key={eqIdx} className="px-2 py-1 bg-brand-bg text-brand-text-main rounded-md font-medium text-[10px] border border-brand-border">
                        {eq}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
