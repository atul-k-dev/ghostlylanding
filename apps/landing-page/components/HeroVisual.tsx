"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TABS = ["Overview", "Timeline", "Logs"];

// Icons with micro animations
const IconLike = () => <svg className="h-5 w-5 text-fg hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>;
const IconFollow = () => <svg className="h-5 w-5 text-fg hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;
const IconComment = () => <svg className="h-5 w-5 text-fg hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>;
const IconShare = () => <svg className="h-5 w-5 text-fg hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>;

const CAMPAIGNS = [
  { id: 'c1', title: "Auto-Like Founders", status: "In Progress", type: 'active', target: 50, icon: <IconLike /> },
  { id: 'c2', title: "Smart Follow Batch", status: "Scheduled • Starts in 2h", type: 'waiting', icon: <IconFollow /> },
  { id: 'c3', title: "Engage #buildinpublic", status: "In Progress", type: 'active', target: 100, icon: <IconComment /> },
  { id: 'c4', title: "Network Expansion", status: "Scheduled • Starts in 5h", type: 'waiting', icon: <IconShare /> }
];

const TIMELINE_BASE = [
  { id: 't1', action: "Auto-Liked post by", user: "@tech_founder", icon: <IconLike />, color: "text-vivid-crimson" },
  { id: 't2', action: "Left a comment on", user: "@saas_builder", icon: <IconComment />, color: "text-emerald-green" },
  { id: 't3', action: "Followed prospect", user: "@indie_hacker", icon: <IconFollow />, color: "text-goldenrod" },
  { id: 't4', action: "Shared update from", user: "@design_system", icon: <IconShare />, color: "text-accent" },
  { id: 't5', action: "Analyzed post by", user: "@startup_daily", icon: <IconLike />, color: "text-vivid-crimson" },
];

const LOGS_BASE = [
  "Target identified: @tech_founder",
  "Analyzing recent posts...",
  "Generated contextual comment.",
  "Action completed: Comment.",
  "Sleeping for 2 minutes...",
  "Waking up for next batch.",
  "Scanning timeline...",
  "Found matching criteria."
];

export function HeroVisual() {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  
  const [progress1, setProgress1] = useState(24);
  const [progress2, setProgress2] = useState(82);
  
  const [logs, setLogs] = useState(() => LOGS_BASE.slice(0, 6).map((log, i) => ({ text: log, id: i })));

  // Overview Progress Loops
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress1(p => p >= 50 ? 0 : p + 1);
      setProgress2(p => p >= 100 ? 0 : p + 2);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  // Logs Terminal Feed Loop
  useEffect(() => {
    let counter = 100;
    let logIndex = 6;
    const interval = setInterval(() => {
      setLogs(prev => {
        const nextLog = LOGS_BASE[logIndex % LOGS_BASE.length];
        logIndex++;
        return [...prev.slice(1), { text: nextLog, id: counter++ }];
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Double items for infinite marquee scrolling
  const duplicatedOverview = [...CAMPAIGNS, ...CAMPAIGNS];
  const duplicatedTimeline = [...TIMELINE_BASE, ...TIMELINE_BASE];

  return (
    <div className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden group">
      <div className="flex w-full max-w-[550px] justify-center md:justify-end mt-6 md:mt-10">
        <div className="relative w-full">
          {/* Main App Window */}
          <div className="w-full rounded-xl bg-[#0A0A0A] border border-b-5 border-r-5 border-white/20 overflow-hidden pt-4 pb-4 pl-6 pr-6">
            
            {/* App Header */}
            <div className="flex items-center gap-2 mb-6">
              <div className="h-3 w-3 rounded-full bg-vivid-crimson hover:opacity-80 transition-opacity" />
              <div className="h-3 w-3 rounded-full bg-goldenrod hover:opacity-80 transition-opacity" />
              <div className="h-3 w-3 rounded-full bg-emerald-green hover:opacity-80 transition-opacity" />
            </div>

            {/* App Title & Tabs */}
            <div className="mb-6 flex items-center justify-between border-b border-border pb-4 relative z-20 bg-[#0A0A0A]">
              <div className="flex gap-6">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`font-inter text-sm relative transition-colors ${activeTab === tab ? 'text-fg font-semibold' : 'text-iron-slate hover:text-fg'}`}
                  >
                    {tab}
                    {activeTab === tab && (
                      <motion.div
                        layoutId="activeTabIndicator"
                        className="absolute -bottom-[17px] left-0 right-0 h-[2px] bg-fg"
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                  </button>
                ))}
              </div>
              <div className="hidden sm:block rounded-lg bg-ghost-white px-4 py-2 text-xs font-semibold text-deep-space hover:bg-subtle-gray cursor-pointer transition transform active:scale-95">
                New Target
              </div>
            </div>

            {/* Tab Content Area */}
            <div className="relative h-[340px] w-full overflow-hidden">
              <AnimatePresence mode="wait">
                
                {/* OVERVIEW TAB */}
                {activeTab === "Overview" && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, filter: 'blur(4px)' }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 overflow-hidden"
                  >
                    <motion.div
                      animate={{ y: ["0%", "-50%"] }}
                      transition={{ ease: "linear", duration: 15, repeat: Infinity }}
                      className="flex flex-col gap-4 w-full pb-4 hover:[animation-play-state:paused]"
                    >
                      {duplicatedOverview.map((campaign, idx) => (
                        <div 
                          key={`${campaign.id}-${idx}`}
                          className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg bg-card border border-border p-4 transition-transform hover:scale-[1.02] gap-4 sm:gap-0 cursor-default shrink-0"
                        >
                          <div className="flex items-center gap-4 w-full">
                            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-muted text-fg">
                              {campaign.icon}
                            </div>
                            <div className="flex-1 pr-4">
                              <div className="font-inter text-[15px] font-medium text-fg">{campaign.title}</div>
                              <div className="font-inter text-xs text-iron-slate mt-1 flex items-center justify-between w-full">
                                <span>{campaign.status}</span>
                                {campaign.type === 'active' && (
                                  <span>{campaign.id === 'c1' ? progress1 : progress2}/{campaign.target || 100} completed</span>
                                )}
                              </div>
                              {/* Progress Bar */}
                              {campaign.type === 'active' && (
                                <div className="w-full h-1.5 bg-muted rounded-full mt-1.5 overflow-hidden">
                                  <motion.div 
                                    className="h-full bg-emerald-green"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${((campaign.id === 'c1' ? progress1 : progress2) / (campaign.target || 100)) * 100}%` }}
                                    transition={{ duration: 0.5, ease: "easeInOut" }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                          {campaign.type === 'active' ? (
                            <span className="self-start sm:self-auto rounded-md bg-emerald-green/10 border border-emerald-green/20 px-2.5 py-1 text-xs font-semibold text-emerald-green whitespace-nowrap flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-green animate-pulse" />
                              Active
                            </span>
                          ) : (
                            <span className="self-start sm:self-auto rounded-md bg-[#252525] border border-white/5 px-2.5 py-1 text-xs font-semibold text-iron-slate whitespace-nowrap">
                              Waiting
                            </span>
                          )}
                        </div>
                      ))}
                    </motion.div>
                  </motion.div>
                )}

                {/* TIMELINE TAB */}
                {activeTab === "Timeline" && (
                  <motion.div
                    key="timeline"
                    initial={{ opacity: 0, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, filter: 'blur(4px)' }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 overflow-hidden"
                  >
                    <motion.div
                      animate={{ y: ["0%", "-50%"] }}
                      transition={{ ease: "linear", duration: 12, repeat: Infinity }}
                      className="flex flex-col gap-3 w-full pb-3 hover:[animation-play-state:paused]"
                    >
                      {duplicatedTimeline.map((item, idx) => (
                        <div
                          key={`${item.id}-${idx}`}
                          className="bg-card border border-border rounded-lg p-3.5 flex items-center gap-4 shrink-0 transition-transform hover:scale-[1.02] cursor-default"
                        >
                          <div className={`flex h-9 w-9 flex-none items-center justify-center rounded-md bg-muted ${item.color}`}>
                            {item.action.includes('Liked') ? (
                              <div className="animate-pulse">{item.icon}</div>
                            ) : (
                              item.icon
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-inter text-sm text-iron-slate truncate">
                              {item.action} <span className="font-medium text-fg">{item.user}</span>
                            </div>
                          </div>
                          <div className="text-[10px] font-mono text-iron-slate/50">
                            Now
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  </motion.div>
                )}

                {/* LOGS TAB */}
                {activeTab === "Logs" && (
                  <motion.div
                    key="logs"
                    initial={{ opacity: 0, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, filter: 'blur(4px)' }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 bg-[#0A0A0A] border border-border rounded-lg p-5 font-mono text-[12px] overflow-hidden flex flex-col justify-end"
                  >
                    <AnimatePresence initial={false}>
                      {logs.map((log) => (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, x: -5, height: 0 }}
                          animate={{ opacity: 1, x: 0, height: 'auto' }}
                          exit={{ opacity: 0, height: 0, margin: 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-iron-slate py-1.5 flex items-center"
                        >
                          <span className="text-emerald-green mr-3 animate-pulse">›</span>
                          {log.text}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {/* Blinking cursor */}
                    <div className="py-1.5 flex items-center">
                      <span className="text-emerald-green mr-3">›</span>
                      <motion.div 
                        animate={{ opacity: [1, 0] }}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                        className="w-1.5 h-3.5 bg-iron-slate"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
