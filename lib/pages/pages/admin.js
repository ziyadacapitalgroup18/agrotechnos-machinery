import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { Trash2, Plus, Save, LogOut, Upload } from "lucide-react";

const CATEGORIES = ["tractor", "plough", "ridger"];

export default function Admin() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState("products");

  const [products, setProducts] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [settings, setSettings] = useState({});
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) loadAll();
  }, [session]);

  async function loadAll() {
    const [{ data: p }, { data: t }, { data: s }] = await Promise.all([
      supabase.from("products").select("*").order("sort_order"),
      supabase.from("testimonials").select("*").order("id", { ascending: false }),
      supabase.from("settings").select("*"),
    ]);
    setProducts(p || []);
    setTestimonials(t || []);
    const settingsMap = {};
    (s || []).forEach((row) => { settingsMap[row.key] = row.value; });
    setSettings(settingsMap);
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setLoginError(error.message);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  // ---- Products ----
  function updateProductField(id, field, value) {
    setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  }

  async function saveProduct(p) {
    setSavingId(p.id);
    await supabase.from("products").upsert(p);
    setSavingId(null);
  }

  async function deleteProduct(id) {
    if (!confirm("Delete this product?")) return;
    await supabase.from("products").delete().eq("id", id);
    setProducts((ps) => ps.filter((p) => p.id !== id));
  }

  function addBlankProduct() {
    const id = `NEW-${Date.now()}`;
    setProducts((ps) => [...ps, { id, category: "tractor", name: "New Product", spec: "", price: 0, image_url: "", active: true, sort_order: ps.length + 1 }]);
  }

  async function uploadImage(productId, file) {
    const ext = file.name.split(".").pop();
    const path = `${productId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
    if (error) { alert("Upload failed: " + error.message); return; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    updateProductField(productId, "image_url", data.publicUrl);
  }

  // ---- Testimonials ----
  function updateTestimonialField(id, field, value) {
    setTestimonials((ts) => ts.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  }

  async function saveTestimonial(t) {
    setSavingId(t.id);
    await supabase.from("testimonials").upsert(t);
    setSavingId(null);
  }
  async function deleteTestimonial(id) {
    if (!confirm("Delete this testimonial?")) return;
    await supabase.from("testimonials").delete().eq("id", id);
    setTestimonials((ts) => ts.filter((t) => t.id !== id));
  }

  async function addTestimonial() {
    const { data } = await supabase.from("testimonials").insert({ name: "New Customer", location: "", product: "", quote: "", rating: 5 }).select();
    if (data) setTestimonials((ts) => [data[0], ...ts]);
  }

  // ---- Settings ----
  function updateSetting(key, value) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  async function saveSettings() {
    setSavingId("settings");
    const rows = Object.entries(settings).map(([key, value]) => ({ key, value }));
    await supabase.from("settings").upsert(rows);
    setSavingId(null);
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#1C2126" }}>
        <form onSubmit={handleLogin} className="w-full max-w-sm p-6 rounded-sm" style={{ background: "#F5F3EE" }}>
          <h1 className="text-2xl font-bold mb-1">Admin Login</h1>
          <p className="text-sm mb-4" style={{ color: "#6B7480" }}>Sign in with the account you created in Supabase.</p>
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full mb-3 p-2 rounded-sm" style={{ border: "1px solid #D8D3C7" }} />
          <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mb-3 p-2 rounded-sm" style={{ border: "1px solid #D8D3C7" }} />
          {loginError && <p className="text-sm text-red-600 mb-3">{loginError}</p>}
          <button type="submit" className="w-full py-2 rounded-sm font-semibold" style={{ background: "#1C2126", color: "#F5F3EE" }}>Log In</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#F5F3EE", fontFamily: "sans-serif" }}>
      <div className="flex items-center justify-between p-5" style={{ background: "#1C2126", color: "#F5F3EE" }}>
        <h1 className="text-xl font-bold">Site Admin</h1>
        <button onClick={handleLogout} className="flex items-center gap-2 text-sm"><LogOut size={16} /> Log out</button>
      </div>

      <div className="flex gap-2 p-5 pb-0">
        {["products", "testimonials", "settings"].map((t) => (
          <button key={t} onClick={() => setTab(t)} className="px-4 py-2 text-sm font-semibold rounded-sm capitalize"
            style={{ background: tab === t ? "#1C2126" : "transparent", color: tab === t ? "#F5F3EE" : "#1C2126", border: "1px solid #1C2126" }}>
            {t}
          </button>
        ))}
      </div>

      <div className="p-5 max-w-4xl">
        {tab === "products" && (
          <div className="flex flex-col gap-4">
            <button onClick={addBlankProduct} className="self-start flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-semibold" style={{ background: "#E8A33D" }}>
              <Plus size={16} /> Add Product
            </button>
            {products.map((p) => (
              <div key={p.id} className="p-4 rounded-sm grid gap-3" style={{ background: "#fff", border: "1px solid #E1DDD3" }}>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold block mb-1">Name</label>
                    <input value={p.name} onChange={(e) => updateProductField(p.id, "name", e.target.value)} className="w-full p-2 rounded-sm text-sm" style={{ border: "1px solid #D8D3C7" }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">Category</label>
                    <select value={p.category} onChange={(e) => updateProductField(p.id, "category", e.target.value)} className="w-full p-2 rounded-sm text-sm" style={{ border: "1px solid #D8D3C7" }}>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">Spec line</label>
                    <input value={p.spec || ""} onChange={(e) => updateProductField(p.id, "spec", e.target.value)} className="w-full p-2 rounded-sm text-sm" style={{ border: "1px solid #D8D3C7" }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">Price (USD)</label>
                    <input type="number" value={p.price} onChange={(e) => updateProductField(p.id, "price", parseFloat(e.target.value) || 0)} className="w-full p-2 rounded-sm text-sm" style={{ border: "1px solid #D8D3C7" }} />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {p.image_url && <img src={p.image_url} alt="" className="w-16 h-16 object-cover rounded-sm" />}
                  <label className="flex items-center gap-2 px-3 py-2 rounded-sm text-sm cursor-pointer" style={{ border: "1px solid #D8D3C7" }}>
                    <Upload size={14} /> Upload Photo
<input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && uploadImage(p.id, e.target.files[0])} />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={p.active} onChange={(e) => updateProductField(p.id, "active", e.target.checked)} /> Visible on site
                  </label>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => saveProduct(p)} className="flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-semibold" style={{ background: "#1C2126", color: "#fff" }}>
                    <Save size={14} /> {savingId === p.id ? "Saving..." : "Save"}
                  </button>
                  <button onClick={() => deleteProduct(p.id)} className="flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-semibold" style={{ border: "1px solid #8B4A2B", color: "#8B4A2B" }}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "testimonials" && (
          <div className="flex flex-col gap-4">
            <button onClick={addTestimonial} className="self-start flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-semibold" style={{ background: "#E8A33D" }}>
              <Plus size={16} /> Add Testimonial
            </button>
            {testimonials.map((t) => (
              <div key={t.id} className="p-4 rounded-sm grid gap-3" style={{ background: "#fff", border: "1px solid #E1DDD3" }}>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold block mb-1">Customer Name</label>
                    <input value={t.name} onChange={(e) => updateTestimonialField(t.id, "name", e.target.value)} className="w-full p-2 rounded-sm text-sm" style={{ border: "1px solid #D8D3C7" }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">Location</label>
                    <input value={t.location || ""} onChange={(e) => updateTestimonialField(t.id, "location", e.target.value)} className="w-full p-2 rounded-sm text-sm" style={{ border: "1px solid #D8D3C7" }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">Product Purchased</label>
                    <input value={t.product || ""} onChange={(e) => updateTestimonialField(t.id, "product", e.target.value)} className="w-full p-2 rounded-sm text-sm" style={{ border: "1px solid #D8D3C7" }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">Rating (1-5)</label>
                    <input type="number" min="1" max="5" value={t.rating} onChange={(e) => updateTestimonialField(t.id, "rating", parseInt(e.target.value) || 5)} className="w-full p-2 rounded-sm text-sm" style={{ border: "1px solid #D8D3C7" }} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Quote</label>
                  <textarea value={t.quote} onChange={(e) => updateTestimonialField(t.id, "quote", e.target.value)} rows={3} className="w-full p-2 rounded-sm text-sm" style={{ border: "1px solid #D8D3C7" }} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => saveTestimonial(t)} className="flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-semibold" style={{ background: "#1C2126", color: "#fff" }}>
                    <Save size={14} /> {savingId === t.id ? "Saving..." : "Save"}
                  </button>
                  <button onClick={() => deleteTestimonial(t.id)} className="flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-semibold" style={{ border: "1px solid #8B4A2B", color: "#8B4A2B" }}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "settings" && (
          <div className="p-4 rounded-sm grid gap-3 max-w-lg" style={{ background: "#fff", border: "1px solid #E1DDD3" }}>
            <div>
              <label className="text-xs font-semibold block mb-1">Business Name</label>
              <input value={settings.business_name || ""} onChange={(e) => updateSetting("business_name", e.target.value)} className="w-full p-2 rounded-sm text-sm" style={{ border: "1px solid #D8D3C7" }} />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Contact Email</label>
              <input value={settings.business_email || ""} onChange={(e) => updateSetting("business_email", e.target.value)} className="w-full p-2 rounded-sm text-sm" style={{ border: "1px solid #D8D3C7" }} />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">WhatsApp Number (country code + number, no + or spaces)</label>
              <input value={settings.whatsapp_number || ""} onChange={(e) => updateSetting("whatsapp_number", e.target.value)} className="w-full p-2 rounded-sm text-sm" style={{ border: "1px solid #D8D3C7" }} />
            </div>
            <button onClick={saveSettings} className="flex items-center justify-center gap-2 px-4 py-2 rounded-sm text-sm font-semibold" style={{ background: "#1C2126", color: "#fff" }}>
              <Save size={14} /> {savingId === "settings" ? "Saving..." : "Save Settings"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
