import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Zap, ShieldAlert, Layers, Home as HomeIcon, Map as MapIcon, Shield, Settings, FileText, TrendingUp, Wind, Flame, Users, Activity, Radio, Award, Clock, AlertTriangle, Heart } from "lucide-react";
import { MRUBuilding3D } from "@/components/visualization/MRUBuilding3D";
import { GeospatialMap } from "@/components/visualization/GeospatialMap";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/cannon";
import { OrbitControls as OrbitControlsImpl, PerspectiveCamera as PerspectiveCameraImpl } from "@react-three/drei";
import { useIsMobile } from "@/hooks/useMobile";
import React, { useState, Suspense, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useSocket } from "@/contexts/SocketContext";
import { toast } from 'sonner';
import { useLocation } from "wouter";
import { jsPDF } from "jspdf";

// --- UI COMPONENTS ---

function TypewriterText({ text, speed = 20 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let i = 0;
    setDisplayed("");
    const timer = setInterval(() => {
      setDisplayed((prev) => text.substring(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return <span>{displayed}</span>;
}

export default function Home() {
  const { logout } = useAuth();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [commandState, setCommandState] = useState<any>(null);
  const lastPhaseRef = useRef<string | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const [spreadHeatmap, setSpreadHeatmap] = useState<any[]>([]);
  const [elapsedTimer, setElapsedTimer] = useState(0);

  const triggerMutation = trpc.emergency.triggerFireCommand.useMutation({
    onSuccess: () => {
      setIsTriggering(false);
      toast.success("🔥 FIRECOMMAND INITIATED — Multi-agent orchestration active");
    },
    onError: (err) => {
      setIsTriggering(false);
      console.error("[FireCommand Error]", err);
      toast.error(`Trigger Failed: ${err.message || 'Server Unreachable'}`);
    }
  });

  const resetMutation = trpc.emergency.resetFireCommand.useMutation({
    onSuccess: () => {
      setCommandState(null);
      lastPhaseRef.current = null;
      setSpreadHeatmap([]);
      setElapsedTimer(0);
      toast.success("SYSTEM RESET — All clear");
    }
  });

  const { socket } = useSocket();

  const playAlarm = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.warn("Audio Context failed:", e);
    }
  }, []);

  const sendPushNotification = useCallback((message: string) => {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
      new Notification("🚨 FIRECOMMAND ALERT", {
        body: message,
        icon: "/favicon.ico"
      });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification("🚨 FIRECOMMAND ALERT", {
            body: message,
            icon: "/favicon.ico"
          });
        }
      });
    }
  }, []);

  const generateReport = () => {
    if (!commandState) return;

    const doc = new jsPDF();
    const state = commandState;

    doc.setFontSize(22);
    doc.text("MRUH FireCommand — After Action Report", 20, 20);
    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString()} | Duration: ${state.success_metrics.time_minutes} minutes`, 20, 30);
    doc.line(20, 35, 190, 35);

    doc.setFont("helvetica", "bold");
    doc.text("INCIDENT SUMMARY", 20, 45);
    doc.setFont("helvetica", "normal");
    doc.text(`Origin: ${state.incident_summary.location.zone}`, 20, 52);
    doc.text(`Confidence: ${(state.incident_summary.confidence * 100).toFixed(0)}%`, 20, 59);
    doc.text(`Wind: ${state.predictions.wind.direction} | Spread: ${state.predictions.spread_direction}`, 20, 66);

    doc.setFont("helvetica", "bold");
    doc.text("EVACUATION METRICS", 20, 80);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Evacuated: ${state.success_metrics.evacuated_count}/${state.evacuation.population_total}`, 20, 87);
    doc.text(`Casualties: ${state.success_metrics.casualties}`, 20, 94);
    doc.text(`Vulnerable Persons Prioritized: ${state.success_metrics.vulnerable_prioritized ? 'YES' : 'NO'}`, 20, 101);

    doc.setFont("helvetica", "bold");
    doc.text("SDG IMPACT SCORES", 20, 115);
    doc.setFont("helvetica", "normal");
    doc.text(`SDG 11 (Sustainable Cities): ${state.sdg_scores.sdg11}/100`, 20, 122);
    doc.text(`SDG 13 (Climate Action): ${state.sdg_scores.sdg13}/100`, 20, 129);
    doc.text(`SDG 03 (Good Health): ${state.sdg_scores.sdg03}/100`, 20, 136);
    doc.text(`COMBINED SDG SCORE: ${state.sdg_scores.combined}/100`, 20, 143);

    doc.setFont("helvetica", "bold");
    doc.text("AGENT REASONING LOG", 20, 157);
    doc.setFontSize(10);
    let y = 164;
    state.agent_log.forEach((log: any) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "bold");
      doc.text(`${log.agent} (${log.phase}):`, 20, y);
      doc.setFont("helvetica", "normal");
      const splitText = doc.splitTextToSize(log.reasoning, 160);
      doc.text(splitText, 25, y + 5);
      y += 10 + (splitText.length * 5);
    });

    doc.save(`FireCommand_Report_${Date.now()}.pdf`);
    toast.success("After Action Report Generated");
  };

  useEffect(() => {
    if (!socket) return;

    socket.on("firecommand_update", (state: any) => {
      setCommandState(state);
      if (state?.timer_seconds) setElapsedTimer(state.timer_seconds);

      // Trigger alerts on detection (transition from DETECTING to SPREADING)
      if (state?.phase === 'SPREADING' && lastPhaseRef.current === 'DETECTING') {
        playAlarm();
        sendPushNotification(`FIRE DETECTED at ${state.incident_summary.location.zone}. AI Orchestration initiated.`);
        document.body.classList.add('alert-flash-red');
        setTimeout(() => document.body.classList.remove('alert-flash-red'), 2000);
      }

      if (state?.phase) {
        lastPhaseRef.current = state.phase;
      }
    });

    socket.on("spread_update", (data: any) => {
      if (data?.heatmap) setSpreadHeatmap(data.heatmap);
    });

    return () => {
      socket.off("firecommand_update");
      socket.off("spread_update");
    };
  }, [socket, playAlarm, sendPushNotification]);

  const handleTrigger = () => {
    setIsTriggering(true);
    triggerMutation.mutate({
      zone: "Engineering Block Floor 3",
      wind_direction_deg: 0, // North
      wind_speed_mps: 15,
    });
  };

  const handleReset = () => {
    resetMutation.mutate();
  };

  const phase = commandState?.phase || 'IDLE';
  const isActive = phase !== 'IDLE';
  const isComplete = phase === 'COMPLETE';
  const isCritical = isActive && !isComplete;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`font-sans text-slate-100 min-h-screen flex flex-col overflow-x-hidden transition-colors duration-1000 ${isCritical ? 'bg-[#0a0000]' : 'bg-[#020617]'}`}>

      {/* Critical Alert Bar */}
      {isCritical && (
        <div className="w-full bg-[#ff003c]/10 border-b border-[#ff003c]/30 py-2 flex items-center justify-center animate-pulse z-[100] relative">
          <ShieldAlert className="mr-3 text-[#ff003c]" size={18} />
          <span className="text-[#ff003c] font-black uppercase tracking-[0.3em] text-xs">
            FIRECOMMAND ACTIVE | PHASE: {phase} | {formatTime(elapsedTimer)}
          </span>
          <ShieldAlert className="ml-3 text-[#ff003c]" size={18} />
        </div>
      )}

      {/* Scoreboard */}
      {isComplete && (
        <div className="w-full bg-[#00ffaa]/5 border-b-4 border-[#00ffaa] py-6 flex flex-col items-center z-[100] relative animate-in fade-in duration-500">
          <Award className="text-[#00ffaa] mb-2" size={40} />
          <h1 className="text-3xl font-black text-white tracking-tight">
            {commandState.success_metrics.evacuated_count} EVACUATED IN {commandState.success_metrics.time_minutes} MINUTES
          </h1>
          <p className="text-[#00ffaa] font-black uppercase tracking-[0.4em] text-lg mt-1">
            {commandState.success_metrics.casualties} CASUALTIES • {commandState.evacuation.vulnerable_total} VULNERABLE PRIORITIZED
          </p>
        </div>
      )}

      {/* Header */}
      <header className={`sticky top-0 z-50 flex items-center justify-between px-8 py-3 backdrop-blur-xl transition-all ${isCritical ? 'bg-[#0a0000]/90 border-b border-[#ff003c]/20' : 'bg-[#020617]/95 border-b border-white/5'}`}>
        <div className="flex items-center gap-6">
          <div className={`p-2 border ${isCritical ? 'text-[#ff003c] border-[#ff003c]/50' : 'text-[#0dccf2] border-[#0dccf2]/30'}`}>
            <Flame size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              FIRE<span className={`font-black ${isCritical ? 'text-[#ff003c]' : 'text-[#0dccf2]'}`}>COMMAND</span>
            </h1>
            <p className="text-[9px] text-white/30 uppercase tracking-widest">
              AI CITY EVACUATION & MEDICAL RESPONSE COPILOT • SDG 11 + 13 + 3
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isActive && (
            <div className={`px-4 py-2 text-xs font-black animate-pulse border ${isCritical ? 'bg-[#ff003c]/20 border-[#ff003c] text-[#ff003c]' : 'bg-[#00ffaa]/20 border-[#00ffaa] text-[#00ffaa]'}`}>
              <Clock size={12} className="inline mr-2" />{formatTime(elapsedTimer)}
            </div>
          )}
          {isComplete && (
            <Button onClick={generateReport} className="bg-[#00ffaa] hover:bg-[#00ffaa]/80 text-black font-black text-xs h-9">
              <FileText size={14} className="mr-2" /> DOWNLOAD REPORT
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setLocation("/")}>Home</Button>
          <Button variant="outline" size="sm" onClick={() => setLocation("/how-it-works")}>How It Works</Button>
          <button onClick={() => logout()} className="p-2 border border-white/10 hover:border-[#0dccf2]">
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 max-w-[2000px] mx-auto w-full flex flex-col gap-6">

        {/* SDG Alignment Bar */}
        <div className="grid grid-cols-3 gap-px bg-white/5">
          <div className="bg-black/40 p-3 flex items-center gap-3 border-l-4 border-[#ff003c]">
            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">SDG 11</span>
            <span className="text-[10px] text-[#ff003c] font-bold">Sustainable Cities</span>
          </div>
          <div className="bg-black/40 p-3 flex items-center gap-3 border-l-4 border-[#00ffaa]">
            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">SDG 13</span>
            <span className="text-[10px] text-[#00ffaa] font-bold">Climate Action</span>
          </div>
          <div className="bg-black/40 p-3 flex items-center gap-3 border-l-4 border-[#0dccf2]">
            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">SDG 3</span>
            <span className="text-[10px] text-[#0dccf2] font-bold">Good Health</span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

          {/* LEFT SIDEBAR — Trigger + Wind + Spread Info */}
          <div className="flex flex-col gap-4">
            {!isActive ? (
              <Card className="p-6 bg-black/40 border-[#ff003c]/30 border-2 flex flex-col items-center gap-4">
                <Flame size={40} className="text-[#ff003c]" />
                <h2 className="text-lg font-black text-white uppercase tracking-tight">TRIGGER FIRE</h2>
                <p className="text-[10px] text-slate-400 text-center">Initiates multi-agent AI orchestration: detection → spread prediction → 4 routes → vulnerable prioritization → resource dispatch → broadcast 700 → vitals monitoring</p>
                <Button onClick={handleTrigger} disabled={isTriggering} className="w-full bg-[#ff003c] hover:bg-[#ff003c]/80 text-white font-black text-sm py-6">
                  {isTriggering ? <Loader2 className="animate-spin mr-2" size={16} /> : <Flame className="mr-2" size={16} />}
                  TRIGGER FIRECOMMAND
                </Button>
              </Card>
            ) : (
              <>
                {/* Panel: AGENT_REASONING_LOG */}
                <Card className="p-4 bg-[#010613] border-2 border-[#0dccf2]/30 flex flex-col h-[300px]">
                  <h3 className="text-[10px] font-black text-[#0dccf2] tracking-widest mb-3 flex items-center gap-2">
                    <Radio size={12} className="animate-pulse" /> AGENT_THINKING_LOG
                  </h3>
                  <div className="flex-1 overflow-y-auto space-y-3 font-mono text-[10px]">
                    {commandState.agent_log.map((log: any, i: number) => (
                      <div key={i} className="border-l-2 border-[#0dccf2]/20 pl-3 py-1">
                        <p className="text-[#0dccf2] font-bold uppercase mb-1">
                          🤖 {log.agent} <span className="text-white/20 ml-2">[{log.duration_ms}ms]</span>
                        </p>
                        <p className="text-white/70 leading-relaxed italic">
                          <TypewriterText text={log.reasoning} />
                        </p>
                      </div>
                    ))}
                    {commandState.phase !== 'COMPLETE' && (
                      <div className="flex items-center gap-2 text-[#0dccf2]/50 italic">
                        <Loader2 size={10} className="animate-spin" />
                        Waiting for next agent...
                      </div>
                    )}
                  </div>
                </Card>

                {/* Phase Progress */}
                <Card className="p-4 bg-black/40 border-[#ff003c]/20">
                  <h3 className="text-[10px] font-black text-[#ff003c] tracking-widest mb-3">PHASE_TRACKER</h3>
                  <div className="space-y-2">
                    {['DETECTING', 'SPREADING', 'ROUTING', 'DISPATCHING', 'BROADCASTING', 'MONITORING', 'COMPLETE'].map(p => (
                      <div key={p} className={`flex items-center gap-2 text-[10px] px-2 py-1 ${phase === p ? 'bg-[#ff003c]/10 text-[#ff003c] font-black border-l-2 border-[#ff003c]' : (['DETECTING', 'SPREADING', 'ROUTING', 'DISPATCHING', 'BROADCASTING', 'MONITORING', 'COMPLETE'].indexOf(p) < ['DETECTING', 'SPREADING', 'ROUTING', 'DISPATCHING', 'BROADCASTING', 'MONITORING', 'COMPLETE'].indexOf(phase) ? 'text-[#00ffaa]' : 'text-white/20')}`}>
                        <div className={`w-2 h-2 rounded-full ${phase === p ? 'bg-[#ff003c] animate-pulse' : (['DETECTING', 'SPREADING', 'ROUTING', 'DISPATCHING', 'BROADCASTING', 'MONITORING', 'COMPLETE'].indexOf(p) < ['DETECTING', 'SPREADING', 'ROUTING', 'DISPATCHING', 'BROADCASTING', 'MONITORING', 'COMPLETE'].indexOf(phase) ? 'bg-[#00ffaa]' : 'bg-white/10')}`}></div>
                        {p}
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Wind + Spread Info (SDG 13) */}
                {commandState?.predictions && (
                  <Card className="p-4 bg-black/40 border-[#00ffaa]/20">
                    <h3 className="text-[10px] font-black text-[#00ffaa] tracking-widest mb-3 flex items-center gap-2">
                      <Wind size={12} /> SDG_13_CLIMATE
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-white/40">Wind Direction</span>
                        <span className="text-[#00ffaa] font-bold">{commandState.predictions.wind.direction} @ {commandState.predictions.wind.speed_mps} m/s</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-white/40">Spread Direction</span>
                        <span className="text-[#ff003c] font-bold">{commandState.predictions.spread_direction}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-white/40">Evac Window</span>
                        <span className="text-[#ff9900] font-bold animate-pulse">{commandState.predictions.evac_window_minutes} MIN</span>
                      </div>
                      {/* Wind Arrow */}
                      <div className="flex justify-center py-2">
                        <div className="w-16 h-16 border-2 border-[#00ffaa]/30 rounded-full flex items-center justify-center relative">
                          <div style={{ transform: `rotate(${commandState.predictions.wind.direction_deg}deg)` }} className="transition-transform">
                            <div className="w-0.5 h-8 bg-[#00ffaa] relative">
                              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-b-[8px] border-l-transparent border-r-transparent border-b-[#00ffaa]"></div>
                            </div>
                          </div>
                          <span className="absolute text-[8px] text-[#00ffaa] top-0">N</span>
                          <span className="absolute text-[8px] text-white/30 bottom-0">S</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                <Button onClick={handleReset} variant="outline" className="w-full text-xs border-white/10 text-white/50 hover:text-white">
                  <Shield className="mr-2" size={12} /> RESET SYSTEM
                </Button>
              </>
            )}
          </div>

          {/* CENTER — 3D Building + Heatmap */}
          <div className="xl:col-span-2 space-y-4">
            <div className={`relative w-full h-[500px] lg:h-[700px] glass-panel p-1 border-[3px] transition-all ${isCritical ? 'border-[#ff003c]/60 shadow-[0_0_40px_rgba(255,0,60,0.3)]' : 'border-[#0dccf2]/30'}`}>
              <div className="w-full h-full absolute inset-0 z-0">
                <Canvas shadows>
                  <PerspectiveCameraImpl makeDefault position={[0, 50, 150]} fov={50} />
                  <Physics gravity={[0, -20, 0]}>
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[100, 150, 100]} intensity={1.5} />
                    <Suspense fallback={null}>
                      <MRUBuilding3D onIncidentTriggered={() => { }} isCritical={isCritical} scenario={isCritical ? 'TEST_CASE_3' : null} />
                    </Suspense>
                    <OrbitControlsImpl maxPolarAngle={Math.PI / 2} />
                  </Physics>
                </Canvas>
              </div>

              {/* HUD Overlay */}
              <div className="absolute top-4 left-4 p-3 bg-black/80 border border-white/10 text-[10px] z-10">
                <p className="text-[#0dccf2]">&gt; MRUH CAMPUS DIGITAL TWIN</p>
                <p className={isCritical ? 'text-[#ff003c]' : 'text-white/40'}>&gt; STATUS: {phase}</p>
                {commandState?.predictions && <p className="text-[#00ffaa]">&gt; WIND: {commandState.predictions.wind.direction} {commandState.predictions.wind.speed_mps}m/s</p>}
              </div>
            </div>

            {/* Geospatial Map */}
            <GeospatialMap />
          </div>

          {/* RIGHT SIDEBAR — All Command Panels */}
          <div className="xl:col-span-2 flex flex-col gap-4">

            {/* Panel 1: FIRECOMMAND CONSOLE */}
            {commandState && (
              <Card className={`p-4 bg-[#010613] border-2 ${isCritical ? 'border-[#ff003c]/30' : 'border-[#00ffaa]/30'}`}>
                <h2 className="text-[10px] font-black text-[#ff003c] tracking-widest mb-3 flex items-center gap-2">
                  <Flame size={12} /> INCIDENT_SUMMARY
                </h2>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="bg-white/5 p-2 rounded"><p className="text-white/40">Zone</p><p className="text-white font-bold">{commandState.incident_summary.location.zone}</p></div>
                  <div className="bg-white/5 p-2 rounded"><p className="text-white/40">Confidence</p><p className="text-[#00ffaa] font-bold">{(commandState.incident_summary.confidence * 100).toFixed(0)}%</p></div>
                  <div className="bg-white/5 p-2 rounded"><p className="text-white/40">Population</p><p className="text-[#0dccf2] font-bold">{commandState.evacuation.population_total}</p></div>
                  <div className="bg-white/5 p-2 rounded"><p className="text-white/40">Vulnerable</p><p className="text-[#ff9900] font-bold">{commandState.evacuation.vulnerable_total}</p></div>
                </div>
              </Card>
            )}

            {/* Panel 2: 4 ROUTES (SDG 11) */}
            {commandState?.evacuation?.routes?.length > 0 && (
              <Card className="p-4 bg-[#010613] border border-white/5">
                <h2 className="text-[10px] font-black text-[#0dccf2] tracking-widest mb-3 flex items-center gap-2">
                  <TrendingUp size={12} /> 4_EVACUATION_ROUTES
                </h2>
                <div className="space-y-2">
                  {commandState.evacuation.routes.map((route: any, i: number) => {
                    const colors = ['#0dccf2', '#00ffaa', '#ff9900', '#a855f7'];
                    return (
                      <div key={route.type} className="bg-white/5 p-3 rounded border-l-3" style={{ borderLeftColor: colors[i], borderLeftWidth: 3 }}>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-white font-black uppercase">{route.type}</span>
                          <span className="text-[10px] font-bold" style={{ color: colors[i] }}>{route.eta_min} min</span>
                        </div>
                        <p className="text-[9px] text-slate-400 mt-1">{route.description}</p>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Panel 3: VULNERABLE PRIORITY (SDG 3) */}
            {commandState && (
              <Card className="p-4 bg-[#010613] border border-white/5">
                <h2 className="text-[10px] font-black text-[#ff9900] tracking-widest mb-3 flex items-center gap-2">
                  <Users size={12} /> VULNERABLE_PRIORITY_BOARD
                </h2>
                <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                  <div className="bg-[#ff003c]/10 p-3 rounded border border-[#ff003c]/20">
                    <p className="text-[#ff003c] text-lg font-black">{commandState.health_ops.triage_summary.red}</p>
                    <p className="text-white/40 text-[8px] uppercase">CRITICAL</p>
                  </div>
                  <div className="bg-[#ff9900]/10 p-3 rounded border border-[#ff9900]/20">
                    <p className="text-[#ff9900] text-lg font-black">{commandState.health_ops.triage_summary.yellow}</p>
                    <p className="text-white/40 text-[8px] uppercase">EVACUATING</p>
                  </div>
                  <div className="bg-[#00ffaa]/10 p-3 rounded border border-[#00ffaa]/20">
                    <p className="text-[#00ffaa] text-lg font-black">{commandState.health_ops.triage_summary.green}</p>
                    <p className="text-white/40 text-[8px] uppercase">SAFE</p>
                  </div>
                </div>
                <div className="mt-3 h-2 bg-white/5 rounded-full overflow-hidden flex">
                  <div className="bg-[#00ffaa] transition-all" style={{ width: `${(commandState.health_ops.triage_summary.green / 33) * 100}%` }}></div>
                  <div className="bg-[#ff9900] transition-all" style={{ width: `${(commandState.health_ops.triage_summary.yellow / 33) * 100}%` }}></div>
                  <div className="bg-[#ff003c] transition-all" style={{ width: `${(commandState.health_ops.triage_summary.red / 33) * 100}%` }}></div>
                </div>
              </Card>
            )}

            {/* Panel 4: RESOURCE DISPATCH */}
            {commandState?.resources?.ambulances_dispatched?.length > 0 && (
              <Card className="p-4 bg-[#010613] border border-white/5">
                <h2 className="text-[10px] font-black text-[#ff003c] tracking-widest mb-3 flex items-center gap-2">
                  <Activity size={12} /> RESOURCE_DISPATCH
                </h2>
                <div className="space-y-2">
                  {commandState.resources.ambulances_dispatched.map((amb: any) => (
                    <div key={amb.id} className="flex justify-between items-center bg-white/5 p-2 rounded border-l-2 border-[#ff003c]">
                      <span className="text-[10px] text-white font-bold">{amb.name}</span>
                      <span className="text-[9px] text-[#ff9900]">ETA {amb.eta_minutes}m → {amb.target_zone}</span>
                    </div>
                  ))}
                  {commandState.resources.fire_response.map((fr: any) => (
                    <div key={fr.id} className="flex justify-between items-center bg-white/5 p-2 rounded border-l-2 border-[#ff9900]">
                      <span className="text-[10px] text-white font-bold">{fr.name}</span>
                      <span className="text-[9px] text-[#00ffaa]">{fr.status.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Panel 5: BROADCAST CONSOLE */}
            {commandState && (
              <Card className="p-4 bg-[#010613] border border-white/5">
                <h2 className="text-[10px] font-black text-[#0dccf2] tracking-widest mb-3 flex items-center gap-2">
                  <Radio size={12} /> BROADCAST_CONSOLE
                </h2>
                <div className="grid grid-cols-3 gap-2 text-[10px] mb-3">
                  <div className="bg-white/5 p-2 rounded text-center">
                    <p className="text-white/40 text-[8px]">TARGET</p>
                    <p className="text-[#0dccf2] font-black text-lg">{commandState.broadcast.target_count}</p>
                  </div>
                  <div className="bg-white/5 p-2 rounded text-center">
                    <p className="text-white/40 text-[8px]">SENT</p>
                    <p className="text-[#00ffaa] font-black text-lg">{commandState.broadcast.sent_count}</p>
                  </div>
                  <div className="bg-white/5 p-2 rounded text-center">
                    <p className="text-white/40 text-[8px]">SEEN</p>
                    <p className="text-[#ff9900] font-black text-lg">{commandState.broadcast.seen_count}</p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#0dccf2] to-[#00ffaa] transition-all duration-1000" style={{ width: `${(commandState.broadcast.sent_count / commandState.broadcast.target_count) * 100}%` }}></div>
                </div>
                {commandState.broadcast.message && (
                  <p className="text-[9px] text-slate-400 mt-2 italic border-l-2 border-white/10 pl-2">"{commandState.broadcast.message}"</p>
                )}
              </Card>
            )}

            {/* Panel 6: SDG IMPACT SCORECARD */}
            {commandState && (
              <Card className="p-4 bg-[#010613] border-2 border-[#00ffaa]/30">
                <h2 className="text-[10px] font-black text-[#00ffaa] tracking-widest mb-3 flex items-center gap-2">
                  <Award size={12} /> SDG_IMPACT_SCORECARD
                </h2>
                <div className="space-y-3">
                  {[
                    { id: '11', label: 'Sustainable Cities', score: commandState.sdg_scores.sdg11, color: '#ff003c' },
                    { id: '13', label: 'Climate Action', score: commandState.sdg_scores.sdg13, color: '#00ffaa' },
                    { id: '03', label: 'Good Health', score: commandState.sdg_scores.sdg03, color: '#0dccf2' }
                  ].map(sdg => (
                    <div key={sdg.id}>
                      <div className="flex justify-between text-[9px] mb-1">
                        <span className="text-white/50">SDG {sdg.id} {sdg.label}</span>
                        <span style={{ color: sdg.color }} className="font-bold">{sdg.score}%</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full transition-all duration-1000" style={{ width: `${sdg.score}%`, backgroundColor: sdg.color }}></div>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-white/5 flex justify-between items-center">
                    <span className="text-[10px] font-black text-white uppercase">Combined Impact</span>
                    <span className="text-xl font-black text-[#00ffaa]">{commandState.sdg_scores.combined}/100</span>
                  </div>
                </div>
              </Card>
            )}

            {/* Panel 7: COUNTERFACTUAL ANALYSIS */}
            {commandState && (
              <Card className="p-4 bg-black border-2 border-white/10 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-1 bg-white/5 text-[7px] text-white/20 font-mono tracking-tighter uppercase">Predictive_Model_V4.2</div>
                <h2 className="text-[10px] font-black text-white/40 tracking-widest mb-3 flex items-center gap-2 uppercase">
                  <TrendingUp size={12} /> Without_FireCommand
                </h2>
                <div className="space-y-2 opacity-50 grayscale transition-all duration-1000">
                  <div className="flex justify-between text-[9px]">
                    <span>Detection Delay</span>
                    <span className="text-red-500 font-mono">+{commandState.counterfactuals.traditional_detection_delay_min}m</span>
                  </div>
                  <div className="flex justify-between text-[9px]">
                    <span>Evacuation Time</span>
                    <span className="text-red-500 font-mono">{commandState.counterfactuals.traditional_time_min}m</span>
                  </div>
                  <div className="flex justify-between text-[9px]">
                    <span>Est. Casualties</span>
                    <span className="text-red-500 font-bold font-mono">{commandState.counterfactuals.traditional_casualties}</span>
                  </div>
                </div>
                <div className="mt-4 p-2 bg-[#ff003c]/10 border border-[#ff003c]/30 text-center animate-pulse">
                  <p className="text-[10px] font-black text-[#ff003c] uppercase">
                    Lives Saved by AI: {commandState.counterfactuals.traditional_casualties}
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
