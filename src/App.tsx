import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────
//  🔧 KONFIGURASI SUPABASE — ganti dengan milik kamu
//  Dapatkan dari: supabase.com → project → Settings → API
// ─────────────────────────────────────────────────────────────
const SUPABASE_URL  = "https://cwkzerbejnhkygjwlyth.supabase.co";  // ganti ini
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3a3plcmJlam5oa3lnandseXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MzQzOTcsImV4cCI6MjA5MjExMDM5N30.kSHbGlzwGbieq_Rsktv6s44CJp_pPhXmGbXnd7PmoKM";     // ganti ini

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ─────────────────────────────────────────────────────────────
//  Konstanta
// ─────────────────────────────────────────────────────────────
const TOOLS = ["All Tools","Midjourney","Stable Diffusion","DALL-E","Firefly","Sora","Runway","Kling","Pika","Luma","Other"];
const TYPES = ["All Types","image","video"];

// ─────────────────────────────────────────────────────────────
//  Komponen kecil
// ─────────────────────────────────────────────────────────────
function TagBadge({ tag }) {
  return (
    <span style={{ background:"rgba(99,202,183,0.15)", color:"#63cab7", border:"1px solid rgba(99,202,183,0.3)", borderRadius:"20px", padding:"2px 10px", fontSize:"11px", fontFamily:"'Space Mono',monospace", letterSpacing:"0.05em" }}>
      {tag}
    </span>
  );
}

function Spinner() {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"80px 20px", gap:"16px" }}>
      <div style={{ width:36, height:36, border:"3px solid rgba(99,202,183,0.2)", borderTop:"3px solid #63cab7", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <p style={{ margin:0, fontFamily:"'Space Mono',monospace", fontSize:"12px", color:"#5a7a72" }}>Memuat data...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Lightbox
// ─────────────────────────────────────────────────────────────
function Lightbox({ images, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  const prev = () => setIdx(i => (i - 1 + images.length) % images.length);
  const next = () => setIdx(i => (i + 1) % images.length);
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.93)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <button onClick={onClose} style={{ position:"absolute", top:20, right:24, background:"none", border:"none", color:"#ccc", fontSize:"28px", cursor:"pointer" }}>✕</button>
      {images.length > 1 && <button onClick={e=>{e.stopPropagation();prev();}} style={{ position:"absolute", left:16, background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", color:"#fff", borderRadius:"50%", width:44, height:44, fontSize:"20px", cursor:"pointer" }}>‹</button>}
      <img src={images[idx]} alt="" onClick={e=>e.stopPropagation()} style={{ maxWidth:"88vw", maxHeight:"88vh", objectFit:"contain", borderRadius:"12px", boxShadow:"0 24px 80px rgba(0,0,0,0.8)" }} />
      {images.length > 1 && <button onClick={e=>{e.stopPropagation();next();}} style={{ position:"absolute", right:16, background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", color:"#fff", borderRadius:"50%", width:44, height:44, fontSize:"20px", cursor:"pointer" }}>›</button>}
      {images.length > 1 && <div style={{ position:"absolute", bottom:20, left:"50%", transform:"translateX(-50%)", fontFamily:"'Space Mono',monospace", fontSize:"12px", color:"#888" }}>{idx+1} / {images.length}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Image strip (thumbnail row)
// ─────────────────────────────────────────────────────────────
function ImageStrip({ images, onOpen }) {
  if (!images || images.length === 0) return null;
  const show  = images.slice(0, 4);
  const extra = images.length - 4;
  return (
    <div style={{ display:"flex", gap:"6px", marginBottom:"12px", flexWrap:"wrap" }}>
      {show.map((src, i) => (
        <div key={i} onClick={() => onOpen(i)}
          style={{ position:"relative", width:72, height:72, borderRadius:"8px", overflow:"hidden", cursor:"zoom-in", flexShrink:0, border:"1px solid rgba(255,255,255,0.1)", transition:"transform 0.15s, border-color 0.15s" }}
          onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.05)";e.currentTarget.style.borderColor="#63cab7";}}
          onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";}}>
          <img src={src} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          {i===3 && extra>0 && <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.65)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Space Mono',monospace", color:"#fff", fontSize:"14px", fontWeight:"bold" }}>+{extra}</div>}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Prompt Card
// ─────────────────────────────────────────────────────────────
function PromptCard({ prompt, onEdit, onDelete, onCopy }) {
  const [expanded, setExpanded] = useState(false);
  const [lightbox, setLightbox]  = useState(null);
  const typeColor = prompt.type === "image" ? "#f4a261" : "#a78bfa";
  const typeIcon  = prompt.type === "image" ? "⬡" : "▶";
  const images    = prompt.images || [];

  return (
    <>
      {lightbox !== null && <Lightbox images={images} startIndex={lightbox} onClose={() => setLightbox(null)} />}
      <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"16px", padding:"20px 22px", transition:"border-color 0.2s, transform 0.2s", position:"relative", overflow:"hidden" }}
        onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(99,202,183,0.4)";e.currentTarget.style.transform="translateY(-2px)";}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.08)";e.currentTarget.style.transform="translateY(0)";}}>

        <div style={{ position:"absolute", top:0, left:0, width:"3px", height:"100%", background:typeColor, borderRadius:"16px 0 0 16px" }} />

        <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"6px" }}>
          <span style={{ color:typeColor, fontSize:"13px", fontFamily:"'Space Mono',monospace" }}>{typeIcon} {prompt.type.toUpperCase()}</span>
          <span style={{ color:"#666", fontSize:"12px", fontFamily:"'Space Mono',monospace" }}>• {prompt.tool}</span>
          <span style={{ color:"#555", fontSize:"11px", marginLeft:"auto" }}>{prompt.created_at?.split("T")[0]}</span>
        </div>
        <h3 style={{ margin:"0 0 12px", fontSize:"16px", fontFamily:"'Playfair Display',serif", color:"#f0ece4", fontWeight:600 }}>{prompt.title}</h3>

        {images.length > 0 && (
          <>
            <p style={{ margin:"0 0 6px", fontSize:"11px", color:"#666", fontFamily:"'Space Mono',monospace", textTransform:"uppercase", letterSpacing:"0.08em" }}>Preview Hasil · {images.length} gambar</p>
            <ImageStrip images={images} onOpen={setLightbox} />
          </>
        )}

        <div style={{ margin:"0 0 12px", background:"rgba(0,0,0,0.3)", borderRadius:"10px", padding:"12px 14px" }}>
          <p style={{ margin:0, fontSize:"13px", lineHeight:"1.6", fontFamily:"'Space Mono',monospace", color:"#b0c4bc", display:expanded?"block":"-webkit-box", WebkitLineClamp:expanded?"unset":3, WebkitBoxOrient:"vertical", overflow:"hidden", whiteSpace:"pre-wrap", wordBreak:"break-word" }}>{prompt.prompt}</p>
          {prompt.prompt.length > 150 && (
            <button onClick={()=>setExpanded(!expanded)} style={{ background:"none", border:"none", color:"#63cab7", cursor:"pointer", fontSize:"12px", fontFamily:"'Space Mono',monospace", padding:"4px 0 0" }}>{expanded?"↑ Lebih sedikit":"↓ Lihat semua"}</button>
          )}
        </div>

        {prompt.result && (
          <div style={{ marginBottom:"12px" }}>
            <p style={{ margin:"0 0 4px", fontSize:"11px", color:"#666", fontFamily:"'Space Mono',monospace", textTransform:"uppercase", letterSpacing:"0.08em" }}>Hasil / Catatan</p>
            <p style={{ margin:0, fontSize:"13px", color:"#8a9e98", lineHeight:"1.5" }}>{prompt.result}</p>
          </div>
        )}

        <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"14px" }}>
          {(prompt.tags || []).map(t => <TagBadge key={t} tag={t} />)}
        </div>

        <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", borderTop:"1px solid rgba(255,255,255,0.06)", paddingTop:"12px" }}>
          {[
            { label:"Salin Prompt", action:()=>onCopy(prompt.prompt), color:"#63cab7" },
            { label:"Edit",         action:()=>onEdit(prompt),        color:"#a78bfa" },
            { label:"Hapus",        action:()=>onDelete(prompt.id),   color:"#f87171" },
          ].map(btn => (
            <button key={btn.label} onClick={btn.action}
              style={{ background:"none", border:`1px solid ${btn.color}33`, color:btn.color, borderRadius:"8px", padding:"5px 12px", fontSize:"12px", cursor:"pointer", fontFamily:"'Space Mono',monospace", transition:"background 0.15s" }}
              onMouseEnter={e=>e.currentTarget.style.background=`${btn.color}18`}
              onMouseLeave={e=>e.currentTarget.style.background="none"}>
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
//  Image Upload Area
// ─────────────────────────────────────────────────────────────
function ImageUploadArea({ images, onChange }) {
  const fileRef = useRef();
  const [dragging, setDragging] = useState(false);

  const readFiles = (files) => {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = e => onChange(prev => [...prev, e.target.result]);
      reader.readAsDataURL(file);
    });
  };

  const onDrop = useCallback(e => { e.preventDefault(); setDragging(false); readFiles(e.dataTransfer.files); }, []);

  return (
    <div>
      <div onClick={()=>fileRef.current.click()}
        onDragOver={e=>{e.preventDefault();setDragging(true);}}
        onDragLeave={()=>setDragging(false)}
        onDrop={onDrop}
        style={{ border:`2px dashed ${dragging?"#63cab7":"rgba(255,255,255,0.15)"}`, borderRadius:"10px", padding:"18px", textAlign:"center", cursor:"pointer", transition:"border-color 0.2s, background 0.2s", background:dragging?"rgba(99,202,183,0.07)":"rgba(255,255,255,0.02)", marginBottom:"10px" }}>
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={e=>readFiles(e.target.files)} />
        <div style={{ fontSize:"24px", marginBottom:"6px" }}>🖼️</div>
        <p style={{ margin:0, fontSize:"12px", color:"#5a7a72", fontFamily:"'Space Mono',monospace" }}>
          Klik atau drag & drop gambar hasil<br/>
          <span style={{ color:"#3a5a52" }}>PNG, JPG, WEBP — bisa lebih dari 1</span>
        </p>
      </div>
      {images.length > 0 && (
        <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
          {images.map((src,i) => (
            <div key={i} style={{ position:"relative", width:64, height:64, borderRadius:"8px", overflow:"hidden", border:"1px solid rgba(255,255,255,0.1)" }}>
              <img src={src} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              <button onClick={()=>onChange(prev=>prev.filter((_,j)=>j!==i))} style={{ position:"absolute", top:2, right:2, width:18, height:18, background:"rgba(0,0,0,0.75)", border:"none", borderRadius:"50%", color:"#f87171", fontSize:"11px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Modal Tambah / Edit
// ─────────────────────────────────────────────────────────────
function Modal({ show, onClose, onSave, editData, saving }) {
  const empty = { title:"", type:"image", tool:"Midjourney", tags:"", prompt:"", result:"", images:[] };
  const [form, setForm]     = useState(empty);
  const [imgList, setImgList] = useState([]);

  useEffect(() => {
    if (editData) {
      setForm({ ...editData, tags: Array.isArray(editData.tags) ? editData.tags.join(", ") : (editData.tags || "") });
      setImgList(editData.images || []);
    } else {
      setForm(empty);
      setImgList([]);
    }
  }, [editData, show]);

  if (!show) return null;

  const handleSave = () => {
    if (!form.title.trim() || !form.prompt.trim()) return alert("Judul dan Prompt wajib diisi!");
    onSave({
      ...form,
      tags:   form.tags.split(",").map(t=>t.trim()).filter(Boolean),
      images: imgList,
    });
  };

  const inputStyle = { width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:"10px", padding:"10px 14px", color:"#f0ece4", fontFamily:"'Space Mono',monospace", fontSize:"13px", outline:"none", boxSizing:"border-box", transition:"border-color 0.2s" };
  const labelStyle = { display:"block", marginBottom:"6px", fontSize:"11px", color:"#63cab7", fontFamily:"'Space Mono',monospace", textTransform:"uppercase", letterSpacing:"0.08em" };
  const focus = e => e.target.style.borderColor = "#63cab7";
  const blur  = e => e.target.style.borderColor = "rgba(255,255,255,0.12)";

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.78)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div style={{ background:"#111a18", border:"1px solid rgba(99,202,183,0.25)", borderRadius:"20px", padding:"30px", width:"100%", maxWidth:"600px", maxHeight:"90vh", overflowY:"auto" }}>
        <h2 style={{ margin:"0 0 24px", fontFamily:"'Playfair Display',serif", color:"#f0ece4", fontSize:"22px" }}>
          {editData ? "Edit Prompt" : "Tambah Prompt Baru"}
        </h2>
        <div style={{ display:"grid", gap:"16px" }}>
          <div>
            <label style={labelStyle}>Judul</label>
            <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Nama prompt kamu..." style={inputStyle} onFocus={focus} onBlur={blur} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
            <div>
              <label style={labelStyle}>Tipe</label>
              <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} style={{...inputStyle,cursor:"pointer"}}>
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Tools AI</label>
              <select value={form.tool} onChange={e=>setForm({...form,tool:e.target.value})} style={{...inputStyle,cursor:"pointer"}}>
                {TOOLS.slice(1).map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Tags (pisah dengan koma)</label>
            <input value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})} placeholder="cyberpunk, night, city..." style={inputStyle} onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label style={labelStyle}>Prompt</label>
            <textarea value={form.prompt} onChange={e=>setForm({...form,prompt:e.target.value})} placeholder="Tulis prompt lengkap di sini..." rows={5} style={{...inputStyle,resize:"vertical",lineHeight:"1.6"}} onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label style={labelStyle}>Hasil / Catatan</label>
            <textarea value={form.result} onChange={e=>setForm({...form,result:e.target.value})} placeholder="Deskripsi hasil atau catatan tentang prompt ini..." rows={3} style={{...inputStyle,resize:"vertical",lineHeight:"1.6"}} onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label style={labelStyle}>Upload Gambar Hasil {imgList.length>0&&`· ${imgList.length} gambar`}</label>
            <ImageUploadArea images={imgList} onChange={setImgList} />
          </div>
        </div>
        <div style={{ display:"flex", gap:"10px", marginTop:"24px", justifyContent:"flex-end" }}>
          <button onClick={onClose} disabled={saving} style={{ background:"none", border:"1px solid rgba(255,255,255,0.15)", color:"#888", borderRadius:"10px", padding:"10px 20px", cursor:"pointer", fontFamily:"'Space Mono',monospace", fontSize:"13px" }}>Batal</button>
          <button onClick={handleSave} disabled={saving} style={{ background:"#63cab7", border:"none", color:"#0a1512", borderRadius:"10px", padding:"10px 24px", cursor:"pointer", fontFamily:"'Space Mono',monospace", fontSize:"13px", fontWeight:"bold", opacity:saving?0.7:1 }}>
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  App Utama
// ─────────────────────────────────────────────────────────────
export default function App() {
  const [prompts,    setPrompts]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [search,     setSearch]     = useState("");
  const [filterType, setFilterType] = useState("All Types");
  const [filterTool, setFilterTool] = useState("All Tools");
  const [showModal,  setShowModal]  = useState(false);
  const [editData,   setEditData]   = useState(null);
  const [toast,      setToast]      = useState({ msg:"", type:"ok" });
  const [sortBy,     setSortBy]     = useState("newest");
  const [syncStatus, setSyncStatus] = useState("synced"); // "synced" | "syncing" | "error"

  const showToast = (msg, type="ok") => { setToast({msg,type}); setTimeout(()=>setToast({msg:"",type:"ok"}),3000); };

  // ── Fetch semua prompt dari Supabase ──
  const fetchPrompts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("prompts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { showToast("❌ Gagal memuat data: " + error.message, "err"); setSyncStatus("error"); }
    else { setPrompts(data || []); setSyncStatus("synced"); }
    setLoading(false);
  };

  useEffect(() => { fetchPrompts(); }, []);

  // ── Realtime — update otomatis kalau data berubah di tab/perangkat lain ──
  useEffect(() => {
    const channel = supabase
      .channel("prompts-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "prompts" }, () => {
        fetchPrompts();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  // ── Simpan (insert atau update) ──
  const handleSave = async (data) => {
    setSaving(true);
    setSyncStatus("syncing");
    let error;
    if (editData?.id) {
      // UPDATE
      const { error: e } = await supabase
        .from("prompts")
        .update({ title:data.title, type:data.type, tool:data.tool, tags:data.tags, prompt:data.prompt, result:data.result, images:data.images })
        .eq("id", editData.id);
      error = e;
    } else {
      // INSERT
      const { error: e } = await supabase
        .from("prompts")
        .insert([{ title:data.title, type:data.type, tool:data.tool, tags:data.tags, prompt:data.prompt, result:data.result, images:data.images }]);
      error = e;
    }
    setSaving(false);
    if (error) { showToast("❌ Gagal menyimpan: " + error.message, "err"); setSyncStatus("error"); }
    else { showToast(editData ? "✅ Prompt berhasil diupdate!" : "✅ Prompt berhasil disimpan!"); setSyncStatus("synced"); setShowModal(false); setEditData(null); }
  };

  // ── Hapus ──
  const handleDelete = async (id) => {
    if (!confirm("Yakin ingin menghapus prompt ini?")) return;
    setSyncStatus("syncing");
    const { error } = await supabase.from("prompts").delete().eq("id", id);
    if (error) { showToast("❌ Gagal menghapus: " + error.message, "err"); setSyncStatus("error"); }
    else { showToast("🗑️ Prompt dihapus."); setSyncStatus("synced"); }
  };

  const handleEdit = (p) => { setEditData(p); setShowModal(true); };
  const handleCopy = (text) => { navigator.clipboard.writeText(text); showToast("📋 Prompt tersalin!"); };

  // ── Export ──
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(prompts, null, 2)], { type:"application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "prompt-library.json"; a.click();
    showToast("📦 Exported sebagai JSON!");
  };
  const exportText = () => {
    const text = prompts.map(p =>
      `========================================\nJUDUL   : ${p.title}\nTIPE    : ${p.type.toUpperCase()}\nTOOLS   : ${p.tool}\nTAGS    : ${(p.tags||[]).join(", ")}\nTANGGAL : ${p.created_at?.split("T")[0]}\nGAMBAR  : ${(p.images||[]).length} gambar tersimpan\n\nPROMPT:\n${p.prompt}\n\nHASIL/CATATAN:\n${p.result||"-"}\n`
    ).join("\n");
    const blob = new Blob([text], { type:"text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "prompt-library.txt"; a.click();
    showToast("📄 Exported sebagai TXT!");
  };

  // ── Filter & Sort ──
  const filtered = useMemo(() => {
    let res = [...prompts];
    if (search) {
      const q = search.toLowerCase();
      res = res.filter(p => p.title?.toLowerCase().includes(q) || p.prompt?.toLowerCase().includes(q) || (p.tags||[]).some(t=>t.toLowerCase().includes(q)) || (p.result||"").toLowerCase().includes(q));
    }
    if (filterType !== "All Types") res = res.filter(p => p.type === filterType);
    if (filterTool !== "All Tools") res = res.filter(p => p.tool === filterTool);
    if (sortBy === "newest") res.sort((a,b) => new Date(b.created_at)-new Date(a.created_at));
    else if (sortBy === "oldest") res.sort((a,b) => new Date(a.created_at)-new Date(b.created_at));
    else if (sortBy === "az") res.sort((a,b) => a.title.localeCompare(b.title));
    return res;
  }, [prompts, search, filterType, filterTool, sortBy]);

  const stats = { total:prompts.length, image:prompts.filter(p=>p.type==="image").length, video:prompts.filter(p=>p.type==="video").length, withPreview:prompts.filter(p=>(p.images||[]).length>0).length };

  const syncDot = syncStatus === "synced" ? "#34d399" : syncStatus === "syncing" ? "#f4a261" : "#f87171";
  const syncLabel = syncStatus === "synced" ? "tersinkron" : syncStatus === "syncing" ? "menyinkron..." : "gagal sinkron";

  return (
    <div style={{ minHeight:"100vh", background:"#0a1512", color:"#f0ece4", fontFamily:"sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      {/* Toast */}
      {toast.msg && (
        <div style={{ position:"fixed", top:"20px", right:"20px", background: toast.type==="err" ? "#2a1818" : "#1a2e28", border:`1px solid ${toast.type==="err"?"#f87171":"#63cab7"}`, borderRadius:"10px", padding:"12px 20px", zIndex:999, fontFamily:"'Space Mono',monospace", fontSize:"13px", color: toast.type==="err"?"#f87171":"#63cab7", boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ borderBottom:"1px solid rgba(255,255,255,0.07)", padding:"24px 32px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"16px" }}>
        <div>
          <h1 style={{ margin:0, fontFamily:"'Playfair Display',serif", fontSize:"26px", background:"linear-gradient(135deg,#63cab7,#a78bfa)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>✦ Prompt Library</h1>
          <p style={{ margin:"4px 0 0", fontSize:"12px", color:"#5a7a72", fontFamily:"'Space Mono',monospace" }}>
            AI Prompt Manager &nbsp;·&nbsp; <span style={{ color:syncDot }}>● {syncLabel}</span>
          </p>
        </div>
        <div style={{ display:"flex", gap:"10px", flexWrap:"wrap" }}>
          <button onClick={exportText} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", color:"#b0c4bc", borderRadius:"10px", padding:"9px 16px", cursor:"pointer", fontFamily:"'Space Mono',monospace", fontSize:"12px" }}>⬇ Export TXT</button>
          <button onClick={exportJSON} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", color:"#b0c4bc", borderRadius:"10px", padding:"9px 16px", cursor:"pointer", fontFamily:"'Space Mono',monospace", fontSize:"12px" }}>⬇ Export JSON</button>
          <button onClick={()=>{setEditData(null);setShowModal(true);}} style={{ background:"#63cab7", border:"none", color:"#0a1512", borderRadius:"10px", padding:"9px 20px", cursor:"pointer", fontFamily:"'Space Mono',monospace", fontSize:"13px", fontWeight:"bold" }}>+ Tambah Prompt</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"flex", gap:"16px", padding:"20px 32px", flexWrap:"wrap" }}>
        {[
          { label:"Total Prompt",  value:stats.total,       color:"#63cab7" },
          { label:"Image Prompts", value:stats.image,       color:"#f4a261" },
          { label:"Video Prompts", value:stats.video,       color:"#a78bfa" },
          { label:"Ada Preview",   value:stats.withPreview, color:"#34d399" },
        ].map(s => (
          <div key={s.label} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"12px", padding:"14px 20px", minWidth:"120px" }}>
            <div style={{ fontSize:"24px", fontFamily:"'Playfair Display',serif", color:s.color, fontWeight:700 }}>{s.value}</div>
            <div style={{ fontSize:"11px", color:"#5a7a72", fontFamily:"'Space Mono',monospace", marginTop:"2px" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div style={{ padding:"0 32px 20px", display:"flex", gap:"10px", flexWrap:"wrap" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Cari judul, prompt, atau tag..."
          style={{ flex:1, minWidth:"220px", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"10px", padding:"10px 16px", color:"#f0ece4", fontFamily:"'Space Mono',monospace", fontSize:"13px", outline:"none" }} />
        {[{val:filterType,set:setFilterType,opts:TYPES},{val:filterTool,set:setFilterTool,opts:TOOLS}].map((f,i)=>(
          <select key={i} value={f.val} onChange={e=>f.set(e.target.value)} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"10px", padding:"10px 14px", color:"#f0ece4", fontFamily:"'Space Mono',monospace", fontSize:"12px", cursor:"pointer" }}>
            {f.opts.map(o=><option key={o} value={o} style={{background:"#111a18"}}>{o}</option>)}
          </select>
        ))}
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"10px", padding:"10px 14px", color:"#f0ece4", fontFamily:"'Space Mono',monospace", fontSize:"12px", cursor:"pointer" }}>
          <option value="newest" style={{background:"#111a18"}}>Terbaru</option>
          <option value="oldest" style={{background:"#111a18"}}>Terlama</option>
          <option value="az"     style={{background:"#111a18"}}>A–Z</option>
        </select>
      </div>

      {/* Grid */}
      <div style={{ padding:"0 32px 40px", display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))", gap:"16px" }}>
        {loading ? (
          <div style={{gridColumn:"1/-1"}}><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"60px 20px", color:"#3a5a52", fontFamily:"'Space Mono',monospace" }}>
            <div style={{ fontSize:"48px", marginBottom:"12px" }}>◌</div>
            <p>Tidak ada prompt ditemukan.<br/>Coba ubah filter atau tambah prompt baru.</p>
          </div>
        ) : (
          filtered.map(p => <PromptCard key={p.id} prompt={p} onEdit={handleEdit} onDelete={handleDelete} onCopy={handleCopy} />)
        )}
      </div>

      <Modal show={showModal} onClose={()=>{setShowModal(false);setEditData(null);}} onSave={handleSave} editData={editData} saving={saving} />
    </div>
  );
}
