import React from 'react';
import { LeaderboardUser, User } from '../types';
import { Award, Trophy, Star, ChevronRight, Zap, Flame } from 'lucide-react';

interface LeaderboardProps {
  lang: 'en' | 'es' | 'hi' | 'ja' | 'mr';
  leaderboard: LeaderboardUser[];
  currentUser: User | null;
}

export default function Leaderboard({ lang, leaderboard, currentUser }: LeaderboardProps) {
  // Define badges list
  const badgesList = [
    { name: 'Civic Hero', desc: 'Reported over 10 validated issues', icon: Trophy, color: 'text-brand-primary bg-brand-primary-light' },
    { name: 'Active Citizen', desc: 'Contributed 5 verifications', icon: Star, color: 'text-brand-primary bg-brand-primary-light' },
    { name: 'First Responder', desc: 'Identified an urgent risk hazard', icon: Zap, color: 'text-brand-primary bg-brand-primary-light' },
    { name: 'Spotless Guardian', desc: 'Resolved sanitation issue successfully', icon: Flame, color: 'text-brand-primary bg-brand-primary-light' }
  ];

  // Dynamically overwrite and recalculate leaderboard standings based on current user session
  const processedLeaderboard = leaderboard.map((item) => {
    if (item.isCurrentUser && currentUser) {
      return {
        ...item,
        name: currentUser.name,
        xp: currentUser.xp,
        badgesCount: currentUser.badges.length,
        resolvedIssues: currentUser.reportedCount + currentUser.verifiedCount,
      };
    }
    return item;
  });

  // Sort descending by XP to allow dynamic moving up/down the ranks
  const sortedLeaderboard = [...processedLeaderboard].sort((a, b) => b.xp - a.xp);

  // Map to apply ranks
  const rankedLeaderboard = sortedLeaderboard.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));

  // Find exact dynamic rank of current logged in user
  const myEntry = rankedLeaderboard.find((u) => u.isCurrentUser && currentUser) || { rank: 3, xp: 1540 };
  const myRank = myEntry.rank;
  const myXP = currentUser ? currentUser.xp : myEntry.xp;

  // Calculate level based on XP dynamically (e.g. 500 XP per level)
  const currentLevel = Math.floor(myXP / 500) + 1;
  const prevThreshold = (currentLevel - 1) * 500;
  const nextThreshold = currentLevel * 500;
  const xpInCurrentLevel = myXP - prevThreshold;
  const progressPercent = Math.min(Math.max((xpInCurrentLevel / 500) * 100, 0), 100);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-brand-text-main flex items-center gap-3">
          <Trophy className="w-8 h-8 text-brand-warning" />
          <span>Civic Contribution Leaderboard</span>
        </h1>
        <p className="mt-2 text-brand-text-sub">
          Rankings of local neighborhood heroes protecting community health & safety.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Leaderboard list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-brand-card border border-brand-border rounded-3xl overflow-hidden shadow-brand-sm">
            <div className="p-6 border-b border-brand-border">
              <span className="text-xs font-bold text-brand-text-sub uppercase tracking-wider">Neighborhood Standings</span>
            </div>

            <div className="divide-y divide-brand-border">
              {rankedLeaderboard.map((user) => {
                const isMe = currentUser && user.isCurrentUser;
                
                return (
                  <div 
                    key={user.rank}
                    className={`p-4 flex items-center justify-between transition-colors ${
                      isMe 
                        ? 'bg-brand-primary-light/50 border-y border-brand-primary/20' 
                        : 'hover:bg-brand-bg/50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank Indicator */}
                      <div className="w-8 flex justify-center font-display font-bold text-sm">
                        {user.rank === 1 ? (
                          <span className="text-2xl">🥇</span>
                        ) : user.rank === 2 ? (
                          <span className="text-2xl">🥈</span>
                        ) : user.rank === 3 ? (
                          <span className="text-2xl">🥉</span>
                        ) : (
                          <span className="text-brand-text-sub">#{user.rank}</span>
                        )}
                      </div>

                      {/* User Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-brand-text-main">
                            {user.name}
                          </span>
                          {isMe && (
                            <span className="px-2 py-0.5 text-[10px] bg-brand-primary text-white rounded-full font-bold">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-brand-text-sub mt-0.5">
                          <span>🎯 {user.resolvedIssues} fixed</span>
                          <span>•</span>
                          <span>🏅 {user.badgesCount} badges</span>
                        </div>
                      </div>
                    </div>

                    {/* XP value */}
                    <div className="text-right">
                      <span className="font-mono font-bold text-brand-primary">{user.xp}</span>
                      <span className="text-xs text-brand-text-sub block animate-pulse">XP</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Badges & Gamification Showcase */}
        <div className="space-y-6">
          {/* User Status Card */}
          {currentUser && (
            <div className="bg-brand-primary p-6 rounded-3xl text-white border border-brand-primary/20 shadow-brand-lg">
              <span className="text-[10px] font-bold tracking-widest uppercase opacity-75">Your Profile Status</span>
              <h3 className="text-2xl font-bold font-display mt-1">{currentUser.name}</h3>
              
              <div className="mt-6 flex justify-between items-end">
                <div>
                  <span className="text-xs opacity-75 block">Civic XP Points</span>
                  <span className="text-3xl font-mono font-extrabold mt-1 block">{currentUser.xp}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs opacity-75 block">Class Rank</span>
                  <span className="text-2xl font-bold font-display mt-1 block">🏆 #{myRank}</span>
                </div>
              </div>

              {/* Progress Bar to next level */}
              <div className="mt-4">
                <div className="flex justify-between text-xs opacity-80 mb-1">
                  <span>Level {currentLevel} Hero</span>
                  <span>{currentUser.xp} / {nextThreshold} XP</span>
                </div>
                <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                  <div className="bg-brand-success h-full rounded-full" style={{ width: `${progressPercent}%` }}></div>
                </div>
              </div>
            </div>
          )}

          {/* Available Achievements */}
          <div className="bg-brand-card border border-brand-border p-6 rounded-3xl shadow-brand-sm">
            <h3 className="font-bold text-brand-text-main mb-4">Achievements Registry</h3>
            <div className="space-y-4">
              {badgesList.map((badge, idx) => {
                const Icon = badge.icon;
                const hasBadge = currentUser?.badges?.includes(badge.name);
                
                return (
                  <div key={idx} className="flex gap-4 items-start">
                    <div className={`p-3 rounded-2xl ${badge.color} flex-shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-brand-text-main">{badge.name}</span>
                        {hasBadge && (
                          <span className="text-[10px] text-brand-success font-bold bg-brand-success/10 px-1.5 py-0.5 rounded-sm">Unlocked</span>
                        )}
                      </div>
                      <p className="text-xs text-brand-text-sub mt-1">{badge.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
