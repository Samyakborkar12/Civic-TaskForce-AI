import React from 'react';
import { translations, initialCityMetrics } from '../mockData';
import { ShieldCheck, Camera, Sparkles, Flame, CheckCircle, TrendingUp, MapPin, Eye, ArrowRight, Activity } from 'lucide-react';

interface LandingPageProps {
  lang: 'en' | 'es' | 'hi' | 'ja' | 'mr';
  onGetStarted: (role: 'citizen' | 'municipality') => void;
  activeCount: number;
  resolvedCount: number;
}

export default function LandingPage({ lang, onGetStarted, activeCount, resolvedCount }: LandingPageProps) {
  const t = translations[lang];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b border-brand-border bg-linear-to-b from-brand-primary-light via-brand-bg to-brand-bg">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/10 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-brand-success/10 rounded-full blur-3xl -z-10"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Logo / Badge */}
          <div className="inline-flex items-center gap-2 bg-brand-primary-light border border-brand-primary/20 px-3 py-1.5 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-brand-primary animate-pulse" />
            <span className="text-xs font-semibold text-brand-primary font-display uppercase tracking-wider">
              Smart Governance System
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold tracking-tight text-brand-text-main max-w-4xl mx-auto leading-tight sm:leading-none">
            {t.heroTitle}
          </h1>
          <p className="mt-6 text-lg text-brand-text-sub max-w-2xl mx-auto leading-relaxed">
            {t.heroDesc}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              id="landing-cta-citizen"
              onClick={() => onGetStarted('citizen')}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold flex items-center justify-center gap-2 shadow-brand-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <span>{t.reportBtn}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              id="landing-cta-muni"
              onClick={() => onGetStarted('municipality')}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-brand-card hover:bg-brand-bg text-brand-text-main font-semibold border border-brand-border transition-all cursor-pointer shadow-brand-sm"
            >
              {t.municipality}
            </button>
          </div>

          {/* Live Stats */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="p-6 bg-brand-card border border-brand-border rounded-2xl shadow-brand-sm hover:shadow-brand-md transition-shadow">
              <div className="text-sm font-medium text-brand-text-sub">{t.heroStatsResolved}</div>
              <div className="mt-2 text-3xl font-display font-bold text-brand-success">{resolvedCount}</div>
              <div className="text-xs text-brand-text-sub mt-1">98% customer satisfaction</div>
            </div>
            <div className="p-6 bg-brand-card border border-brand-border rounded-2xl shadow-brand-sm hover:shadow-brand-md transition-shadow">
              <div className="text-sm font-medium text-brand-text-sub">{t.heroStatsActive}</div>
              <div className="mt-2 text-3xl font-display font-bold text-brand-warning">{activeCount}</div>
              <div className="text-xs text-brand-text-sub mt-1">Average fix time: 21h</div>
            </div>
            <div className="p-6 bg-brand-card border border-brand-border rounded-2xl shadow-brand-sm hover:shadow-brand-md transition-shadow">
              <div className="text-sm font-medium text-brand-text-sub">{t.heroStatsSaved}</div>
              <div className="mt-2 text-3xl font-display font-bold text-brand-primary">{initialCityMetrics.totalSavedBudget}</div>
              <div className="text-xs text-brand-text-sub mt-1">Preemptive road repair savings</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Simple Steps */}
      <section className="py-20 bg-brand-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-display font-bold text-brand-text-main">How Civic Taskforce Works</h2>
            <p className="mt-4 text-brand-text-sub">Our platform simplifies reporting, enabling you to take charge of your neighborhood improvement in seconds.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Step 1 */}
            <div className="text-center p-6 rounded-2xl bg-brand-bg border border-brand-border">
              <div className="w-16 h-16 bg-brand-primary-light rounded-2xl flex items-center justify-center mx-auto mb-6 text-brand-primary shadow-brand-sm">
                <Camera className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-brand-text-main mb-3">{t.step1}</h3>
              <p className="text-brand-text-sub text-sm leading-relaxed">
                {t.step1Desc}
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center p-6 rounded-2xl bg-brand-bg border border-brand-border">
              <div className="w-16 h-16 bg-brand-primary-light rounded-2xl flex items-center justify-center mx-auto mb-6 text-brand-primary shadow-brand-sm">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-brand-text-main mb-3">{t.step2}</h3>
              <p className="text-brand-text-sub text-sm leading-relaxed">
                {t.step2Desc}
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center p-6 rounded-2xl bg-brand-bg border border-brand-border">
              <div className="w-16 h-16 bg-brand-primary-light rounded-2xl flex items-center justify-center mx-auto mb-6 text-brand-primary shadow-brand-sm">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-brand-text-main mb-3">{t.step3}</h3>
              <p className="text-brand-text-sub text-sm leading-relaxed">
                {t.step3Desc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Live AI City Score Section */}
      <section className="py-16 bg-brand-bg border-t border-brand-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-brand-card rounded-3xl p-8 md:p-12 border border-brand-border shadow-brand-md flex flex-col lg:flex-row items-center justify-between gap-10">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 text-brand-success mb-4 font-semibold text-sm">
                <Activity className="w-5 h-5 animate-pulse" />
                <span>Real-time Smart Governance Index</span>
              </div>
              <h2 className="text-3xl font-display font-bold text-brand-text-main">
                Our City Health Score: <span className="text-brand-primary">{initialCityMetrics.healthScore}/100</span>
              </h2>
              <p className="mt-4 text-brand-text-sub">
                Determined by aggregate civic resolution latency, public safety compliance, lighting availability, and waste disposal efficiency calculated by AI analytics. Let's make our neighborhood a pristine 100/100 together!
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <span className="px-3 py-1.5 text-xs bg-brand-bg text-brand-text-main rounded-full font-semibold border border-brand-border">⚡ Utility Grid: {initialCityMetrics.electricityScore}%</span>
                <span className="px-3 py-1.5 text-xs bg-brand-bg text-brand-text-main rounded-full font-semibold border border-brand-border">💧 Water Hydraulics: {initialCityMetrics.waterScore}%</span>
                <span className="px-3 py-1.5 text-xs bg-brand-bg text-brand-text-main rounded-full font-semibold border border-brand-border">🛣️ Roads Transit: {initialCityMetrics.roadsScore}%</span>
              </div>
            </div>
            
            <div className="flex flex-col items-center justify-center p-8 bg-brand-primary-light rounded-2xl border border-brand-primary/20 text-center w-full lg:w-80">
              <span className="text-sm text-brand-text-sub font-medium">Be a Local Hero</span>
              <span className="mt-2 text-5xl font-extrabold text-brand-primary">+100 XP</span>
              <p className="mt-2 text-xs text-brand-text-sub">for each verified issue reported near you.</p>
              <button
                id="landing-cta-hero"
                onClick={() => onGetStarted('citizen')}
                className="mt-6 w-full py-3 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold text-sm transition-all shadow-brand-sm cursor-pointer"
              >
                Start Reporting
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
