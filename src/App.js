import { useState, useRef, useEffect } from "react";
import { supabase } from "./supabase";

const COUNTRIES = ["Tous", "Indonésie", "Japon", "Corée", "Chine", "Vietnam"];
const CATEGORIES = ["Culture", "Food", "Nature", "Ville", "Activité", "Hébergement"];
const RES_TYPES = ["Vol", "Hébergement", "Train", "Ferry", "Activité", "Restaurant"];
const PLATFORMS = ["Airbnb", "Booking", "Air France", "AirAsia", "Klook", "GetYourGuide", "Viator", "Hostelworld", "Autre"];
const CC = { Indonésie: "#F97316", Japon: "#F43F5E", Corée: "#3B82F6", Chine: "#EF4444", Vietnam: "#22C55E" };
const CAT_ICON = { Culture: "⛩", Food: "🍜", Nature: "🌿", Ville: "🏙", Activité: "🎯", Hébergement: "🛏" };
const TYPE_ICON = { Vol: "✈️", Hébergement: "🏠", Train: "🚄", Ferry: "⛴️", Activité: "🎟️", Restaurant: "🍽️" };

function TravelMap({ places, selected, onSelect }) {
  const ref = useRef(null);
  const map = useRef(null);
  const markers = useRef({});

  useEffect(() => {
    if (map.current || !window.L) return;
    map.current = window.L.map(ref.current, { center: [15, 110], zoom: 4, zoomControl: false, attributionControl: false });
    window.L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map.current);
    window.L.control.zoom({ position: "bottomright" }).addTo(map.current);
    window.L.control.attribution({ position: "bottomleft", prefix: false }).addAttribution("© OpenStreetMap © CARTO").addTo(map.current);
  }, []);

  useEffect(() => {
    if (!window.L || !map.current) return;
    Object.values(markers.current).forEach(m => m.remove());
    markers.current = {};
    places.forEach(p => {
      const isSel = selected?.id === p.id;
      const color = CC[p.country] || "#888";
      const icon = window.L.divIcon({
        html: `<div style="width:${isSel?22:14}px;height:${isSel?22:14}px;border-radius:50%;background:${color};border:${isSel?"3px solid #fff":"2px solid rgba(255,255,255,0.8)"};box-shadow:0 2px 8px rgba(0,0,0,0.25)${isSel?`,0 0 0 4px ${color}44`:""};cursor:pointer"></div>`,
        className: "", iconAnchor: [isSel?11:7, isSel?11:7]
      });
      markers.current[p.id] = window.L.marker([p.lat, p.lng], { icon }).addTo(map.current).on("click", () => onSelect(p));
    });
  }, [places, selected]);

  return <div ref={ref} style={{ width: "100%", height: "100%" }} />;
}

export default function App() {
  const [places, setPlaces] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("map");
  const [countryF, setCountryF] = useState("Tous");
  const [catF, setCatF] = useState("Toutes");
  const [leaflet, setLeaflet] = useState(false);
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState([]);
  const [chat, setChat] = useState([{ role: "ai", text: "Bonjour ! Je suis votre assistant voyage 🗺️ Posez-moi des questions sur vos lieux ou réservations." }]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [resForm, setResForm] = useState({ type: "Vol", name: "", platform: "", date: "", time: "", end_date: "", ref: "", note: "", country: "", confirmed: false });
  const [showResForm, setShowResForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const chatEnd = useRef(null);

  // Load Leaflet
  useEffect(() => {
    if (window.L) { setLeaflet(true); return; }
    const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"; document.head.appendChild(css);
    const js = document.createElement("script"); js.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"; js.onload = () => setLeaflet(true); document.head.appendChild(js);
  }, []);

  // Load data from Supabase
  useEffect(() => {
    loadData();
    // Real-time sync
    const placeSub = supabase.channel('places').on('postgres_changes', { event: '*', schema: 'public', table: 'places' }, () => loadPlaces()).subscribe();
    const resSub = supabase.channel('reservations').on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => loadReservations()).subscribe();
    return () => { placeSub.unsubscribe(); resSub.unsubscribe(); };
  }, []);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  const loadPlaces = async () => {
    const { data } = await supabase.from("places").select("*").order("created_at", { ascending: false });
    if (data) setPlaces(data);
  };

  const loadReservations = async () => {
    const { data } = await supabase.from("reservations").select("*").order("date", { ascending: true });
    if (data) setReservations(data);
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadPlaces(), loadReservations()]);
    setLoading(false);
  };

  const filtered = places.filter(p =>
    (countryF === "Tous" || p.country === countryF) &&
    (catF === "Toutes" || p.category === catF)
  );

  const openGoogleMaps = (p) => window.open(`https://www.google.com/maps/search/${encodeURIComponent(p.name + " " + p.city)}`, "_blank");
  const openAppleMaps = (p) => window.open(`https://maps.apple.com/?q=${encodeURIComponent(p.name + " " + p.city)}`, "_blank");

  const exportAllGoogleMaps = () => {
    const url = `https://www.google.com/maps/dir/${filtered.map(p => `${p.lat},${p.lng}`).join("/")}`;
    window.open(url, "_blank");
  };

  const exportCalendar = () => {
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TripMap//FR"];
    reservations.forEach(r => {
      const d = r.date.replace(/-/g, "");
      const t = r.time ? r.time.replace(":", "") + "00" : "120000";
      const ed = (r.end_date || r.date).replace(/-/g, "");
      lines.push("BEGIN:VEVENT", `DTSTART:${d}T${t}`, `DTEND:${ed}T${t}`, `SUMMARY:${TYPE_ICON[r.type]} ${r.name}`, `DESCRIPTION:${r.platform} - Ref: ${r.ref}\\n${r.note}`, `LOCATION:${r.country}`, "END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/calendar" }));
    a.download = "voyage_asie.ics"; a.click();
  };

  const handleExtract = async () => {
    if (!tiktokUrl.trim()) return;
    setExtracting(true); setExtracted([]);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          messages: [{ role: "user", content: `URL: ${tiktokUrl}\nGénère 2-3 lieux réalistes d'une vidéo voyage Asie (Indonésie, Japon, Corée, Chine Sud, Vietnam). JSON uniquement sans backticks:\n{"places":[{"name":"","country":"","city":"","category":"Culture|Food|Nature|Ville|Activité|Hébergement","lat":0,"lng":0,"note":"","priority":"must|normal"}]}` }]
        })
      });
      const data = await res.json();
      const parsed = JSON.parse(data.content?.[0]?.text.replace(/```json|```/g, "").trim() || "{}");
      setExtracted(parsed.places || []);
    } catch { setExtracted([]); }
    setExtracting(false);
  };

  const addPlace = async (p) => {
    setSyncing(true);
    const { data } = await supabase.from("places").insert([{ ...p, thumbnail: "" }]).select();
    if (data) setExtracted(prev => prev.filter(x => x.name !== p.name));
    setSyncing(false);
  };

  const deletePlace = async (id) => {
    await supabase.from("places").delete().eq("id", id);
    if (selected?.id === id) setSelected(null);
  };

  const addReservation = async () => {
    if (!resForm.name || !resForm.date) return;
    setSyncing(true);
    await supabase.from("reservations").insert([resForm]);
    setResForm({ type: "Vol", name: "", platform: "", date: "", time: "", end_date: "", ref: "", note: "", country: "", confirmed: false });
    setShowResForm(false);
    setSyncing(false);
  };

  const deleteReservation = async (id) => {
    await supabase.from("reservations").delete().eq("id", id);
  };

  const toggleConfirmed = async (r) => {
    await supabase.from("reservations").update({ confirmed: !r.confirmed }).eq("id", r.id);
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput; setChatInput("");
    setChat(prev => [...prev, { role: "user", text: msg }]);
    setChatLoading(true);
    const placesList = places.map(p => `- ${p.name} (${p.country}) ${p.priority === "must" ? "⭐" : ""}`).join("\n");
    const resList = reservations.map(r => `- ${r.type}: ${r.name} le ${r.date}`).join("\n");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          messages: [{ role: "user", content: `Assistant voyage expert Asie. Trip 4 mois mi-sept→mi-janv : Indonésie→Japon→Corée→Chine Sud→Vietnam.\nLieux:\n${placesList}\nRéservations:\n${resList}\nQuestion: ${msg}\nRéponds en français, concis et pratique.` }]
        })
      });
      const data = await res.json();
      setChat(prev => [...prev, { role: "ai", text: data.content?.[0]?.text || "Erreur." }]);
    } catch { setChat(prev => [...prev, { role: "ai", text: "Erreur de connexion." }]); }
    setChatLoading(false);
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "Inter, sans-serif", flexDirection: "column", gap: 12, color: "#888" }}>
      <div style={{ fontSize: 32 }}>🗺</div>
      <div style={{ fontSize: 14 }}>Chargement de TripMap…</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: "'Inter', system-ui, sans-serif", background: "#fff", color: "#111", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #ddd; }
        .hov:hover { background: #f5f5f5 !important; }
        input, select, textarea { font-family: 'Inter', sans-serif; }
        input::placeholder, textarea::placeholder { color: #bbb; }
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      {/* NAV */}
      <div style={{ display: "flex", alignItems: "center", padding: "0 16px", height: 52, borderBottom: "1px solid #f0f0f0", gap: 6, flexShrink: 0, background: "#fff", zIndex: 100 }}>
        <span style={{ fontWeight: 700, fontSize: 16, marginRight: 8, letterSpacing: -0.5 }}>🗺 TripMap</span>
        <span style={{ fontSize: 11, color: "#ddd", marginRight: 8 }}>|</span>
        {[["map","🗺 Carte"],["add","＋ Ajouter"],["reservations","📋 Réservations"],["chat","💬 Assistant"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: tab===key?600:400, background: tab===key?"#111":"transparent", color: tab===key?"#fff":"#888", transition: "all 0.15s" }}>
            {label}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {syncing && <span style={{ fontSize: 11, color: "#aaa", animation: "pulse 1s infinite" }}>Synchronisation…</span>}
          <button onClick={exportAllGoogleMaps} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e5e5e5", background: "#fff", cursor: "pointer", fontSize: 12, color: "#555" }}>📍 Google Maps</button>
          <button onClick={exportCalendar} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e5e5e5", background: "#fff", cursor: "pointer", fontSize: 12, color: "#555" }}>📅 Export .ics</button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* MAP TAB */}
        {tab === "map" && (
          <>
            <div style={{ width: 260, borderRight: "1px solid #f0f0f0", display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>
              <div style={{ padding: "12px 14px", borderBottom: "1px solid #f0f0f0" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#bbb", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Pays</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {COUNTRIES.map(c => (
                    <button key={c} onClick={() => setCountryF(c)}
                      style={{ padding: "4px 10px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500, background: countryF===c?(CC[c]||"#111"):"#f4f4f4", color: countryF===c?"#fff":"#555", transition: "all 0.15s" }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ padding: "12px 14px", borderBottom: "1px solid #f0f0f0" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#bbb", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Catégorie</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {["Toutes", ...CATEGORIES].map(c => (
                    <button key={c} onClick={() => setCatF(c)}
                      style={{ padding: "4px 10px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500, background: catF===c?"#111":"#f4f4f4", color: catF===c?"#fff":"#555", transition: "all 0.15s" }}>
                      {CAT_ICON[c]||""} {c}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
                {filtered.length === 0 && (
                  <div style={{ textAlign: "center", padding: "40px 16px", color: "#ccc", fontSize: 13 }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📍</div>
                    Aucun lieu — ajoutez-en via l'onglet ＋
                  </div>
                )}
                {filtered.map(p => (
                  <div key={p.id} className="hov" onClick={() => setSelected(selected?.id===p.id?null:p)}
                    style={{ padding: "10px", borderRadius: 10, marginBottom: 2, cursor: "pointer", background: selected?.id===p.id?"#f5f5f5":"transparent", display: "flex", alignItems: "center", gap: 10, transition: "all 0.1s" }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: CC[p.country]||"#888", flexShrink: 0 }}></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.priority==="must"?"⭐ ":""}{p.name}</div>
                      <div style={{ fontSize: 11, color: "#aaa" }}>{CAT_ICON[p.category]} {p.city}</div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={e=>{e.stopPropagation();openGoogleMaps(p);}} style={{ background:"none",border:"none",cursor:"pointer",fontSize:13,color:"#ccc",padding:2 }} title="Google Maps">↗</button>
                      <button onClick={e=>{e.stopPropagation();deletePlace(p.id);}} style={{ background:"none",border:"none",cursor:"pointer",fontSize:13,color:"#e0e0e0",padding:2 }}>×</button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: "10px 14px", borderTop: "1px solid #f0f0f0", fontSize: 11, color: "#bbb" }}>
                {filtered.length} lieu{filtered.length>1?"x":""} · {places.filter(p=>p.priority==="must").length} incontournables
              </div>
            </div>

            <div style={{ flex: 1, position: "relative" }}>
              {leaflet
                ? <TravelMap places={filtered} selected={selected} onSelect={p=>setSelected(selected?.id===p.id?null:p)} />
                : <div style={{ width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",color:"#bbb",fontSize:13 }}>Chargement…</div>
              }
              <div style={{ position:"absolute",top:12,right:12,background:"rgba(255,255,255,0.95)",borderRadius:10,padding:"10px 14px",boxShadow:"0 2px 12px rgba(0,0,0,0.1)",zIndex:999 }}>
                {COUNTRIES.filter(c=>c!=="Tous").map(c => {
                  const n = places.filter(p=>p.country===c).length;
                  return n>0 ? (
                    <div key={c} onClick={()=>setCountryF(countryF===c?"Tous":c)}
                      style={{ display:"flex",alignItems:"center",gap:7,marginBottom:5,cursor:"pointer",opacity:countryF!=="Tous"&&countryF!==c?0.3:1,transition:"opacity 0.15s" }}>
                      <span style={{ width:8,height:8,borderRadius:"50%",background:CC[c] }}></span>
                      <span style={{ fontSize:12,color:"#444" }}>{c}</span>
                      <span style={{ fontSize:12,fontWeight:700,marginLeft:"auto",paddingLeft:10,color:CC[c] }}>{n}</span>
                    </div>
                  ) : null;
                })}
              </div>
              {selected && (
                <div style={{ position:"absolute",bottom:20,left:"50%",transform:"translateX(-50%)",background:"#fff",borderRadius:14,padding:"14px 18px",boxShadow:"0 4px 24px rgba(0,0,0,0.15)",maxWidth:360,width:"calc(100% - 40px)",zIndex:1000,display:"flex",gap:12,alignItems:"flex-start",border:`2px solid ${CC[selected.country]||"#eee"}` }}>
                  <span style={{ width:8,height:8,borderRadius:"50%",background:CC[selected.country],marginTop:5,flexShrink:0 }}></span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700,fontSize:16,marginBottom:2 }}>{selected.name}</div>
                    <div style={{ fontSize:12,color:"#aaa",marginBottom:6 }}>{CAT_ICON[selected.category]} {selected.category} · {selected.city}, {selected.country}</div>
                    {selected.note && <div style={{ fontSize:13,color:"#666",marginBottom:8 }}>{selected.note}</div>}
                    <div style={{ display:"flex",gap:8,marginTop:8 }}>
                      <button onClick={()=>openGoogleMaps(selected)} style={{ padding:"5px 12px",borderRadius:7,border:"1px solid #e5e5e5",background:"#fff",cursor:"pointer",fontSize:12,fontWeight:500 }}>📍 Google Maps</button>
                      <button onClick={()=>openAppleMaps(selected)} style={{ padding:"5px 12px",borderRadius:7,border:"1px solid #e5e5e5",background:"#fff",cursor:"pointer",fontSize:12,fontWeight:500 }}>🗺 Apple Maps</button>
                    </div>
                  </div>
                  <button onClick={()=>setSelected(null)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#ccc",lineHeight:1,padding:0,flexShrink:0 }}>×</button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ADD TAB */}
        {tab === "add" && (
          <div style={{ flex:1,maxWidth:560,margin:"0 auto",padding:"28px 24px",overflowY:"auto" }}>
            <div style={{ fontWeight:700,fontSize:20,marginBottom:4 }}>Ajouter des lieux</div>
            <div style={{ fontSize:13,color:"#aaa",marginBottom:24 }}>Collez un lien TikTok, Instagram, YouTube — Claude extrait les lieux et les place sur la carte.</div>
            <div style={{ background:"#f9f9f9",borderRadius:14,padding:20,marginBottom:20 }}>
              <label style={lbl}>Lien de la vidéo</label>
              <div style={{ display:"flex",gap:8 }}>
                <input value={tiktokUrl} onChange={e=>setTiktokUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleExtract()} placeholder="https://tiktok.com/@..." style={{ ...inp,flex:1,margin:0 }} />
                <button onClick={handleExtract} disabled={extracting||!tiktokUrl.trim()} style={{ padding:"10px 18px",borderRadius:10,border:"none",background:"#111",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600,opacity:extracting?0.5:1 }}>
                  {extracting?"…":"Extraire"}
                </button>
              </div>
            </div>
            {extracted.length > 0 && (
              <div>
                <div style={{ fontSize:12,fontWeight:600,color:"#aaa",letterSpacing:1,textTransform:"uppercase",marginBottom:12 }}>Lieux détectés</div>
                {extracted.map((p,i) => (
                  <div key={i} style={{ background:"#fff",border:"1px solid #f0f0f0",borderRadius:12,padding:"14px 16px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                    <div>
                      <div style={{ fontWeight:600,fontSize:14 }}>{CAT_ICON[p.category]} {p.name}</div>
                      <div style={{ fontSize:12,color:"#aaa",marginTop:2 }}>{p.city} · {p.country} {p.priority==="must"?"· ⭐":""}</div>
                      {p.note && <div style={{ fontSize:12,color:"#888",marginTop:4,fontStyle:"italic" }}>{p.note}</div>}
                    </div>
                    <button onClick={()=>addPlace(p)} style={{ padding:"7px 16px",borderRadius:8,border:"none",background:CC[p.country]||"#111",color:"#fff",cursor:"pointer",fontSize:12,fontWeight:600,flexShrink:0,marginLeft:12 }}>+ Ajouter</button>
                  </div>
                ))}
                <button onClick={()=>{extracted.forEach(addPlace);setExtracted([]);setTiktokUrl("");}} style={{ width:"100%",padding:"12px 0",borderRadius:10,border:"none",background:"#111",color:"#fff",cursor:"pointer",fontSize:14,fontWeight:600,marginTop:4 }}>
                  Tout ajouter ({extracted.length})
                </button>
              </div>
            )}
          </div>
        )}

        {/* RESERVATIONS TAB */}
        {tab === "reservations" && (
          <div style={{ flex:1,overflowY:"auto",padding:"24px" }}>
            <div style={{ maxWidth:760,margin:"0 auto" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24 }}>
                <div>
                  <div style={{ fontWeight:700,fontSize:20,marginBottom:2 }}>Réservations</div>
                  <div style={{ fontSize:13,color:"#aaa" }}>{reservations.length} résa · {reservations.filter(r=>r.confirmed).length} confirmée{reservations.filter(r=>r.confirmed).length>1?"s":""}</div>
                </div>
                <div style={{ display:"flex",gap:8 }}>
                  <button onClick={exportCalendar} style={{ padding:"8px 16px",borderRadius:9,border:"1px solid #e5e5e5",background:"#fff",cursor:"pointer",fontSize:13,fontWeight:500 }}>📅 Export .ics</button>
                  <button onClick={()=>setShowResForm(!showResForm)} style={{ padding:"8px 16px",borderRadius:9,border:"none",background:"#111",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600 }}>+ Ajouter</button>
                </div>
              </div>

              {showResForm && (
                <div style={{ background:"#f9f9f9",borderRadius:14,padding:20,marginBottom:24,border:"1px solid #f0f0f0" }}>
                  <div style={{ fontWeight:600,fontSize:15,marginBottom:16 }}>Nouvelle réservation</div>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                    <div><label style={lbl}>Type</label><select value={resForm.type} onChange={e=>setResForm(f=>({...f,type:e.target.value}))} style={inp}>{RES_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                    <div><label style={lbl}>Plateforme</label><select value={resForm.platform} onChange={e=>setResForm(f=>({...f,platform:e.target.value}))} style={inp}><option value="">Choisir…</option>{PLATFORMS.map(p=><option key={p}>{p}</option>)}</select></div>
                    <div style={{gridColumn:"1/-1"}}><label style={lbl}>Nom</label><input value={resForm.name} onChange={e=>setResForm(f=>({...f,name:e.target.value}))} placeholder="ex: Paris → Tokyo, Villa Ubud…" style={inp} /></div>
                    <div><label style={lbl}>Date début</label><input type="date" value={resForm.date} onChange={e=>setResForm(f=>({...f,date:e.target.value}))} style={inp} /></div>
                    <div><label style={lbl}>Heure</label><input type="time" value={resForm.time} onChange={e=>setResForm(f=>({...f,time:e.target.value}))} style={inp} /></div>
                    <div><label style={lbl}>Date fin</label><input type="date" value={resForm.end_date} onChange={e=>setResForm(f=>({...f,end_date:e.target.value}))} style={inp} /></div>
                    <div><label style={lbl}>Référence</label><input value={resForm.ref} onChange={e=>setResForm(f=>({...f,ref:e.target.value}))} placeholder="N° de résa" style={inp} /></div>
                    <div><label style={lbl}>Destination</label><select value={resForm.country} onChange={e=>setResForm(f=>({...f,country:e.target.value}))} style={inp}><option value="">–</option>{COUNTRIES.filter(c=>c!=="Tous").map(c=><option key={c}>{c}</option>)}</select></div>
                    <div style={{gridColumn:"1/-1"}}><label style={lbl}>Note</label><input value={resForm.note} onChange={e=>setResForm(f=>({...f,note:e.target.value}))} placeholder="Infos utiles…" style={inp} /></div>
                    <div style={{gridColumn:"1/-1",display:"flex",alignItems:"center",gap:8}}><input type="checkbox" id="conf" checked={resForm.confirmed} onChange={e=>setResForm(f=>({...f,confirmed:e.target.checked}))} /><label htmlFor="conf" style={{fontSize:13,cursor:"pointer"}}>Confirmée</label></div>
                  </div>
                  <div style={{ display:"flex",gap:8,marginTop:16 }}>
                    <button onClick={addReservation} style={{ padding:"10px 20px",borderRadius:9,border:"none",background:"#111",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600 }}>Sauvegarder</button>
                    <button onClick={()=>setShowResForm(false)} style={{ padding:"10px 20px",borderRadius:9,border:"1px solid #e5e5e5",background:"#fff",cursor:"pointer",fontSize:13 }}>Annuler</button>
                  </div>
                </div>
              )}

              {COUNTRIES.filter(c=>c!=="Tous").map(country => {
                const list = reservations.filter(r=>r.country===country);
                if (!list.length) return null;
                return (
                  <div key={country} style={{ marginBottom:28 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:12 }}>
                      <span style={{ width:10,height:10,borderRadius:"50%",background:CC[country] }}></span>
                      <span style={{ fontWeight:700,fontSize:15 }}>{country}</span>
                      <span style={{ fontSize:12,color:"#aaa" }}>{list.length} résa</span>
                    </div>
                    {list.sort((a,b)=>a.date.localeCompare(b.date)).map(r => (
                      <div key={r.id} style={{ background:"#fff",border:"1px solid #f0f0f0",borderRadius:12,padding:"14px 16px",marginBottom:8,display:"flex",gap:14,alignItems:"flex-start",borderLeft:`3px solid ${r.confirmed?CC[country]:"#e5e5e5"}` }}>
                        <div style={{ fontSize:22,flexShrink:0,lineHeight:1 }}>{TYPE_ICON[r.type]}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:3 }}>
                            <span style={{ fontWeight:600,fontSize:14 }}>{r.name}</span>
                            <span onClick={()=>toggleConfirmed(r)}
                              style={{ fontSize:10,background:r.confirmed?"#dcfce7":"#fef9c3",color:r.confirmed?"#16a34a":"#ca8a04",padding:"1px 7px",borderRadius:20,fontWeight:600,cursor:"pointer" }}>
                              {r.confirmed?"✓ Confirmé":"En attente"}
                            </span>
                          </div>
                          <div style={{ fontSize:12,color:"#aaa" }}>
                            {r.platform} · {r.date}{r.time?` à ${r.time}`:""}{r.end_date&&r.end_date!==r.date?` → ${r.end_date}`:""}
                            {r.ref&&<span style={{ marginLeft:8,background:"#f4f4f4",borderRadius:4,padding:"1px 6px",fontSize:11 }}>#{r.ref}</span>}
                          </div>
                          {r.note&&<div style={{ fontSize:12,color:"#888",marginTop:3 }}>{r.note}</div>}
                        </div>
                        <button onClick={()=>deleteReservation(r.id)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#ddd",padding:0,flexShrink:0 }}>×</button>
                      </div>
                    ))}
                  </div>
                );
              })}

              {reservations.length === 0 && (
                <div style={{ textAlign:"center",padding:"60px 20px",color:"#ccc",fontSize:13 }}>
                  <div style={{ fontSize:32,marginBottom:8 }}>✈️</div>
                  Aucune réservation — cliquez sur + Ajouter
                </div>
              )}
            </div>
          </div>
        )}

        {/* CHAT TAB */}
        {tab === "chat" && (
          <div style={{ flex:1,display:"flex",flexDirection:"column",maxWidth:640,margin:"0 auto",width:"100%",padding:"0 16px" }}>
            <div style={{ flex:1,overflowY:"auto",padding:"24px 0",display:"flex",flexDirection:"column",gap:16 }}>
              {chat.map((m,i) => (
                <div key={i} style={{ display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
                  <div style={{ maxWidth:"82%",padding:"12px 16px",borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",background:m.role==="user"?"#111":"#f5f5f5",color:m.role==="user"?"#fff":"#111",fontSize:14,lineHeight:1.65,whiteSpace:"pre-wrap" }}>
                    {m.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display:"flex",gap:5,padding:"12px 16px",background:"#f5f5f5",borderRadius:"16px 16px 16px 4px",width:"fit-content" }}>
                  {[0,1,2].map(i=><div key={i} style={{ width:6,height:6,borderRadius:"50%",background:"#bbb",animation:`bounce 1.2s ${i*0.2}s infinite ease-in-out` }} />)}
                </div>
              )}
              <div ref={chatEnd} />
            </div>
            <div style={{ padding:"16px 0",borderTop:"1px solid #f0f0f0",display:"flex",gap:8 }}>
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleChat()} placeholder="Posez une question sur votre voyage…" style={{ ...inp,flex:1,margin:0 }} />
              <button onClick={handleChat} disabled={chatLoading||!chatInput.trim()} style={{ padding:"10px 18px",borderRadius:10,border:"none",background:"#111",color:"#fff",cursor:"pointer",fontSize:16,opacity:chatLoading?0.4:1 }}>→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const lbl = { display:"block",fontSize:11,fontWeight:600,color:"#aaa",letterSpacing:0.5,textTransform:"uppercase",marginBottom:5 };
const inp = { width:"100%",padding:"9px 12px",borderRadius:9,border:"1px solid #e8e8e8",fontSize:13,outline:"none",background:"#fff",color:"#111",marginBottom:0 };
