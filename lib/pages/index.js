import React, { useState, useMemo, useEffect } from "react";
import {
  Tractor, Layers, SquareStack, ShoppingCart, X, Plus, Minus,
  Mail, MessageCircle, Menu, Ship, Anchor, Wallet, CheckCircle2,
  Star, MapPin, ArrowRight, Package
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

const COLORS = {
  graphite: "#1C2126",
  steel: "#2B3A4A",
  amber: "#E8A33D",
  offwhite: "#F5F3EE",
  rust: "#8B4A2B",
  green: "#4A7A5C",
  line: "#3C4854",
};

const CATEGORY_META = {
  tractor: { label: "Tractors", icon: Tractor, accent: COLORS.amber },
  plough: { label: "Ploughs", icon: Layers, accent: COLORS.rust },
  ridger: { label: "Ridgers", icon: SquareStack, accent: COLORS.green },
};

const fmt = (n) => `$${Number(n).toLocaleString("en-US")}`;

function Nameplate({ product }) {
  const meta = CATEGORY_META[product.category];
  const Icon = meta.icon;
  if (product.image_url) {
    return (
      <div className="relative h-40 rounded-sm overflow-hidden" style={{ border: `1px solid ${COLORS.line}` }}>
        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div
      className="relative flex items-center justify-center h-40 rounded-sm"
      style={{ background: `linear-gradient(135deg, ${COLORS.steel}, ${COLORS.graphite})`, border: `1px solid ${COLORS.line}` }}
    >
      <span className="absolute top-0 left-0 right-0 h-1" style={{ background: meta.accent }} />
      <Icon size={56} strokeWidth={1.25} color={meta.accent} />
      <span className="absolute bottom-2 right-3 text-[10px] tracking-widest mono" style={{ color: "#8B98A5" }}>
        {product.id}
      </span>
    </div>
  );
}

export default function Home() {
  const [products, setProducts] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [settings, setSettings] = useState({ business_name: "", business_email: "", whatsapp_number: "" });
  const [loading, setLoading] = useState(true);

  const [cart, setCart] = useState({});
  const [filter, setFilter] = useState("all");
  const [cartOpen, setCartOpen] = useState(false);
  const [step, setStep] = useState("cart");
  const [menuOpen, setMenuOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", company: "", email: "", whatsapp: "", country: "", port: "", incoterm: "FOB", notes: "",
  });

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: t }, { data: s }] = await Promise.all([
        supabase.from("products").select("*").eq("active", true).order("sort_order"),
        supabase.from("testimonials").select("*").order("id", { ascending: false }),
        supabase.from("settings").select("*"),
      ]);
      setProducts(p || []);
      setTestimonials(t || []);
      const settingsMap = {};
      (s || []).forEach((row) => { settingsMap[row.key] = row.value; });
      setSettings(settingsMap);
      setLoading(false);
    })();
  }, []);

  const addToCart = (id) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const setQty = (id, qty) =>
    setCart((c) => {
      const next = { ...c };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });

  const cartItems = useMemo(
    () => Object.entries(cart).map(([id, qty]) => ({ ...products.find((p) => p.id === id), qty })).filter((i) => i.id),
    [cart, products]
  );
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);
  const subtotal = cartItems.reduce((s, i) => s + i.qty * i.price, 0);

  const filteredProducts = filter === "all" ? products : products.filter((p) => p.category === filter);

  const businessName = settings.business_name || "Your Business";
  const businessEmail = settings.business_email || "";
  const whatsappNumber = settings.whatsapp_number || "";

  const buildSummary = () => {
    const lines = cartItems.map((i) => `- ${i.name} (${i.id}) x${i.qty} @ ${fmt(i.price)} = ${fmt(i.qty * i.price)}`);
    return [
      `Quote Request - ${businessName}`,
      "",
      "ITEMS:",
      ...lines,
      `Subtotal (ex. shipping): ${fmt(subtotal)}`,
      "",
      `Preferred term: ${form.incoterm}`,
      `Name: ${form.name}`,
      form.company ? `Company: ${form.company}` : null,
      `Email: ${form.email}`,
      `WhatsApp: ${form.whatsapp}`,
      `Delivery country: ${form.country}`,
      `Destination port: ${form.port}`,
      form.notes ? `Notes: ${form.notes}` : null,
    ].filter(Boolean).join("\n");
  };

  const mailtoHref = () =>
    `mailto:${businessEmail}?subject=${encodeURIComponent(`Quote Request from ${form.name || "Website"}`)}&body=${encodeURIComponent(buildSummary())}`;

  const waHref = () => `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(buildSummary())}`;

  const formValid = form.name && form.email && form.whatsapp && form.country;

  const scrollTo = (id) => {
    setMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const navLink = "text-sm tracking-wide uppercase hover:opacity-70 transition-opacity cursor-pointer bg-transparent border-0 text-left";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.offwhite }}>
        <span className="mono text-sm" style={{ color: COLORS.graphite }}>Loading...</span>
      </div>
    );
  }
return (
    <div style={{ background: COLORS.offwhite, fontFamily: "'Inter', sans-serif", color: COLORS.graphite }} className="min-h-screen">
      {/* HEADER */}
      <header className="sticky top-0 z-40" style={{ background: COLORS.graphite }}>
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2" style={{ color: COLORS.offwhite }}>
            <Tractor size={26} color={COLORS.amber} />
            <span className="display text-xl font-bold tracking-wide">{businessName.toUpperCase()}</span>
          </div>
          <nav className="hidden md:flex items-center gap-7" style={{ color: "#C9D0D6" }}>
            <button onClick={() => scrollTo("products")} className={navLink}>Equipment</button>
            <button onClick={() => scrollTo("how-it-works")} className={navLink}>Shipping Terms</button>
            <button onClick={() => scrollTo("testimonials")} className={navLink}>Testimonials</button>
            <button onClick={() => scrollTo("contact")} className={navLink}>Contact</button>
          </nav>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setCartOpen(true); setStep("cart"); }}
              className="relative flex items-center gap-2 px-3 py-2 rounded-sm"
              style={{ background: COLORS.amber, color: COLORS.graphite }}
            >
              <ShoppingCart size={18} />
              <span className="text-sm font-semibold hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-[11px] flex items-center justify-center font-bold" style={{ background: COLORS.rust, color: "#fff" }}>
                  {cartCount}
                </span>
              )}
            </button>
            <button className="md:hidden" onClick={() => setMenuOpen((v) => !v)} style={{ color: COLORS.offwhite }}>
              <Menu size={22} />
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden flex flex-col px-5 pb-4" style={{ color: "#C9D0D6", borderTop: "1px solid #3C4854" }}>
            <button onClick={() => scrollTo("products")} className={`${navLink} w-full py-3`} style={{ borderBottom: "1px solid #3C4854" }}>Equipment</button>
            <button onClick={() => scrollTo("how-it-works")} className={`${navLink} w-full py-3`} style={{ borderBottom: "1px solid #3C4854" }}>Shipping Terms</button>
            <button onClick={() => scrollTo("testimonials")} className={`${navLink} w-full py-3`} style={{ borderBottom: "1px solid #3C4854" }}>Testimonials</button>
            <button onClick={() => scrollTo("contact")} className={`${navLink} w-full py-3`}>Contact</button>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden" style={{ background: `linear-gradient(160deg, ${COLORS.graphite}, ${COLORS.steel})` }}>
        <div className="max-w-6xl mx-auto px-5 py-20 md:py-28 grid md:grid-cols-2 gap-10 items-center">
          <div style={{ color: COLORS.offwhite }}>
            <span className="mono text-xs tracking-[0.2em]" style={{ color: COLORS.amber }}>EXPORT-READY FARM MACHINERY</span>
            <h1 className="display text-5xl md:text-6xl font-bold leading-[0.95] mt-3">
              Tractors, Ploughs &amp; Ridgers, Built for the Field, Shipped Worldwide.
            </h1>
            <p className="mt-5 text-base leading-relaxed" style={{ color: "#C9D0D6" }}>
              Browse our equipment list, add to cart, and request a formal quote under FOB, CIF, or deposit terms.
              We'll confirm pricing, shipping, and delivery details directly by email or WhatsApp.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <button onClick={() => scrollTo("products")} className="flex items-center gap-2 px-5 py-3 font-semibold rounded-sm" style={{ background: COLORS.amber, color: COLORS.graphite }}>
                Browse Equipment <ArrowRight size={18} />
              </button>
              <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-5 py-3 font-semibold rounded-sm border" style={{ borderColor: "#4C5A68", color: COLORS.offwhite }}>
                <MessageCircle size={18} /> Chat on WhatsApp
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[Tractor, Layers, SquareStack, Ship].map((Icon, i) => (
              <div key={i} className="flex items-center justify-center h-28 rounded-sm" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #3C4854" }}>
                <Icon size={40} strokeWidth={1.25} color={COLORS.amber} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCTS */}
      <section id="products" className="max-w-6xl mx-auto px-5 py-16">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <span className="mono text-xs tracking-widest" style={{ color: COLORS.rust }}>CATALOG</span>
            <h2 className="display text-4xl font-bold">Available Equipment</h2>
          </div>
          <div className="flex gap-2 flex-wrap">
            {["all", "tractor", "plough", "ridger"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-4 py-2 text-sm font-semibold rounded-sm capitalize"
                style={{
                  background: filter === f ? COLORS.graphite : "transparent",
                  color: filter === f ? COLORS.offwhite : COLORS.graphite,
                  border: `1px solid ${COLORS.graphite}`,
                }}
              >
                {f === "all" ? "All" : CATEGORY_META[f].label}
              </button>
            ))}
          </div>
        </div>

        {filteredProducts.length === 0 && (
          <p className="text-sm" style={{ color: "#6B7480" }}>No equipment listed yet.</p>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((p) => {
            const meta = CATEGORY_META[p.category];
            const qty = cart[p.id] || 0;
            return (
              <div key={p.id} className="rounded-sm overflow-hidden" style={{ background: "#fff", border: "1px solid #E1DDD3" }}>
                <Nameplate product={p} />
                <div className="p-4">
                  <span className="mono text-[11px] tracking-widest" style={{ color: meta.accent }}>{meta.label.toUpperCase()}</span>
                  <h3 className="text-lg font-bold leading-tight mt-1">{p.name}</h3>
                  <p className="mono text-xs mt-1" style={{ color: "#6B7480" }}>{p.spec}</p>
                  <div className="flex items-center justify-between mt-4">
                    <span className="mono text-xl font-bold">{fmt(p.price)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3 gap-2">
                    {qty === 0 ? (
                      <button onClick={() => addToCart(p.id)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-sm font-semibold text-sm" style={{ background: COLORS.graphite, color: COLORS.offwhite }}>
                        <Plus size={16} /> Add to Cart
                      </button>
                    ) : (
                      <div className="flex items-center justify-between w-full rounded-sm" style={{ border: `1px solid ${COLORS.graphite}` }}>
                        <button onClick={() => setQty(p.id, qty - 1)} className="p-2"><Minus size={16} /></button>
                        <span className="mono font-semibold">{qty}</span>
                        <button onClick={() => setQty(p.id, qty + 1)} className="p-2"><Plus size={16} /></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* HOW IT WORKS + TERMS */}
      <section id="how-it-works" style={{ background: COLORS.graphite }} className="py-16">
        <div className="max-w-6xl mx-auto px-5" style={{ color: COLORS.offwhite }}>
          <span className="mono text-xs tracking-widest" style={{ color: COLORS.amber }}>PROCESS</span>
          <h2 className="display text-4xl font-bold mb-8">How a Purchase Works</h2>

          <div className="grid md:grid-cols-4 gap-px mb-14" style={{ background: "#3C4854" }}>
            {[
              ["01", "Add to Cart", "Select equipment and quantities from the catalog."],
              ["02", "Request a Quote", "Submit your delivery details, we confirm final pricing and terms."],
              ["03", "Pay Deposit", "A deposit secures production or stock allocation before shipping."],
              ["04", "Shipping & Balance", "Balance is paid before dispatch. We share tracking once shipped."],
            ].map(([num, title, desc]) => (
              <div key={num} className="p-6" style={{ background: COLORS.graphite }}>
                <span className="mono text-sm" style={{ color: COLORS.amber }}>{num}</span>
                <h3 className="font-bold text-lg mt-2">{title}</h3>
                <p className="text-sm mt-1" style={{ color: "#9AA5B1" }}>{desc}</p>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-5 rounded-sm" style={{ border: "1px solid #3C4854" }}>
              <Anchor size={22} color={COLORS.amber} />
              <h3 className="font-bold text-lg mt-2">FOB (Free on Board)</h3>
              <p className="text-sm mt-2" style={{ color: "#9AA5B1" }}>
                We deliver the equipment on board the vessel at the port of origin. You arrange and pay for ocean freight and insurance from that point.
              </p>
            </div>
            <div className="p-5 rounded-sm" style={{ border: "1px solid #3C4854" }}>
              <Ship size={22} color={COLORS.amber} />
              <h3 className="font-bold text-lg mt-2">CIF (Cost, Insurance, Freight)</h3>
              <p className="text-sm mt-2" style={{ color: "#9AA5B1" }}>
                Price includes freight and insurance to your destination port. Simpler budgeting, fewer logistics steps on your side.
              </p>
            </div>
            <div className="p-5 rounded-sm" style={{ border: "1px solid #3C4854" }}>
              <Wallet size={22} color={COLORS.amber} />
              <h3 className="font-bold text-lg mt-2">Deposit Terms</h3>
              <p className="text-sm mt-2" style={{ color: "#9AA5B1" }}>
                A partial deposit confirms your order. The balance is due before the shipment leaves origin, terms are confirmed on your quote.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="max-w-6xl mx-auto px-5 py-16">
        <span className="mono text-xs tracking-widest" style={{ color: COLORS.rust }}>FROM OUR BUYERS</span>
        <h2 className="display text-4xl font-bold mb-8">Testimonials</h2>
        {testimonials.length === 0 && <p className="text-sm" style={{ color: "#6B7480" }}>No testimonials yet.</p>}
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div key={t.id} className="p-5 rounded-sm" style={{ background: "#fff", border: "1px solid #E1DDD3" }}>
              <div className="flex gap-1 mb-3">
                {Array.from({ length: t.rating || 5 }).map((_, s) => <Star key={s} size={14} fill={COLORS.amber} color={COLORS.amber} />)}
              </div>
<p className="text-sm leading-relaxed" style={{ color: COLORS.graphite }}>"{t.quote}"</p>
              <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: "#6B7480" }}>
                <MapPin size={14} />
                <span className="font-semibold">{t.name}</span> {t.location ? `· ${t.location}` : ""}
              </div>
              {t.product && <div className="mt-1 text-xs mono" style={{ color: COLORS.green }}>Purchased: {t.product}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" style={{ background: COLORS.steel }} className="py-16">
        <div className="max-w-6xl mx-auto px-5 grid md:grid-cols-2 gap-8 items-center">
          <div style={{ color: COLORS.offwhite }}>
            <span className="mono text-xs tracking-widest" style={{ color: COLORS.amber }}>GET IN TOUCH</span>
            <h2 className="display text-4xl font-bold">Talk to Us Directly</h2>
            <p className="mt-3 text-sm" style={{ color: "#C9D0D6" }}>
              Prefer to skip the form? Reach out by email or WhatsApp and we'll help you build a quote.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <a href={`mailto:${businessEmail}`} className="flex-1 flex items-center gap-3 p-4 rounded-sm" style={{ background: COLORS.offwhite }}>
              <Mail size={22} color={COLORS.graphite} />
              <div>
                <div className="font-semibold text-sm" style={{ color: COLORS.graphite }}>Email us</div>
                <div className="mono text-xs" style={{ color: "#6B7480" }}>{businessEmail}</div>
              </div>
            </a>
            <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer" className="flex-1 flex items-center gap-3 p-4 rounded-sm" style={{ background: COLORS.amber }}>
              <MessageCircle size={22} color={COLORS.graphite} />
              <div>
                <div className="font-semibold text-sm" style={{ color: COLORS.graphite }}>WhatsApp</div>
                <div className="mono text-xs" style={{ color: COLORS.graphite }}>+{whatsappNumber}</div>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: COLORS.graphite, color: "#8B98A5" }} className="py-8">
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row justify-between gap-3 text-xs">
          <span>&copy; {new Date().getFullYear()} {businessName}. All rights reserved.</span>
          <span>Prices exclude freight and insurance unless stated as CIF. Final terms confirmed on quote.</span>
        </div>
      </footer>

      {/* CART DRAWER */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0" style={{ background: "rgba(28,33,38,0.6)" }} onClick={() => setCartOpen(false)} />
          <div className="relative w-full sm:w-[420px] h-full overflow-y-auto" style={{ background: COLORS.offwhite }}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid #E1DDD3" }}>
              <h3 className="display text-2xl font-bold">
                {step === "cart" && "Your Cart"}
                {step === "form" && "Delivery Details"}
                {step === "sent" && "Ready to Send"}
              </h3>
              <button onClick={() => setCartOpen(false)}><X size={22} /></button>
            </div>

            {step === "cart" && (
              <div className="p-5 flex flex-col gap-4">
                {cartItems.length === 0 && (
                  <div className="text-center py-16" style={{ color: "#6B7480" }}>
                    <Package size={32} className="mx-auto mb-2" />
                    Your cart is empty. Add equipment to get started.
                  </div>
                )}
                {cartItems.map((i) => (
                  <div key={i.id} className="flex items-center gap-3 p-3 rounded-sm" style={{ background: "#fff", border: "1px solid #E1DDD3" }}>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{i.name}</div>
                      <div className="mono text-xs" style={{ color: "#6B7480" }}>{fmt(i.price)} each</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setQty(i.id, i.qty - 1)} className="p-1 rounded-sm" style={{ border: "1px solid #D8D3C7" }}><Minus size={14} /></button>
                      <span className="mono text-sm w-5 text-center">{i.qty}</span>
                      <button onClick={() => setQty(i.id, i.qty + 1)} className="p-1 rounded-sm" style={{ border: "1px solid #D8D3C7" }}><Plus size={14} /></button>
                    </div>
                    <button onClick={() => setQty(i.id, 0)}><X size={16} color={COLORS.rust} /></button>
                  </div>
                ))}
                {cartItems.length > 0 && (
                  <>
                    <div className="flex justify-between mono font-bold text-lg pt-2" style={{ borderTop: "1px solid #E1DDD3" }}>
                      <span>Subtotal</span><span>{fmt(subtotal)}</span>
                    </div>
                    <p className="text-xs" style={{ color: "#6B7480" }}>Excludes freight, insurance, and duties. Final cost confirmed on your quote.</p>
                    <button onClick={() => setStep("form")} className="mt-2 py-3 rounded-sm font-semibold" style={{ background: COLORS.graphite, color: COLORS.offwhite }}>
                      Continue to Request Quote
                    </button>
                  </>
                )}
              </div>
            )}

            {step === "form" && (
              <div className="p-5 flex flex-col gap-3">
                {[
                  ["name", "Full Name *"],
                  ["company", "Company"],
                  ["email", "Email *"],
                  ["whatsapp", "WhatsApp Number *"],
                  ["country", "Delivery Country *"],
                  ["port", "Destination Port"],
                ].map(([key, label]) => (
                  <div key={key}>
                    <label className="text-xs font-semibold" style={{ color: "#6B7480" }}>{label}</label>
                    <input value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} className="w-full mt-1 p-2 rounded-sm text-sm" style={{ border: "1px solid #D8D3C7", background: "#fff" }} />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-semibold" style={{ color: "#6B7480" }}>Preferred Term</label>
                  <select value={form.incoterm} onChange={(e) => setForm((f) => ({ ...f, incoterm: e.target.value }))} className="w-full mt-1 p-2 rounded-sm text-sm" style={{ border: "1px solid #D8D3C7", background: "#fff" }}>
                    <option>FOB</option>
                    <option>CIF</option>
                    <option>Not sure, please advise</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold" style={{ color: "#6B7480" }}>Notes</label>
                  <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} className="w-full mt-1 p-2 rounded-sm text-sm" style={{ border: "1px solid #D8D3C7", background: "#fff" }} />
                </div>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setStep("cart")} className="flex-1 py-2 rounded-sm text-sm font-semibold" style={{ border: `1px solid ${COLORS.graphite}` }}>Back</button>
                  <button disabled={!formValid} onClick={() => setStep("sent")} className="flex-1 py-2 rounded-sm text-sm font-semibold" style={{ background: formValid ? COLORS.amber : "#D8D3C7", color: COLORS.graphite }}>
                    Review & Send
                  </button>
                </div>
              </div>
            )}

            {step === "sent" && (
              <div className="p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2" style={{ color: COLORS.green }}>
                  <CheckCircle2 size={20} /> <span className="font-semibold text-sm">Your request summary is ready</span>
                </div>
                <pre className="mono text-xs p-3 rounded-sm whitespace-pre-wrap" style={{ background: "#fff", border: "1px solid #E1DDD3" }}>
                  {buildSummary()}
                </pre>
                <a href={mailtoHref()} className="flex items-center justify-center gap-2 py-3 rounded-sm font-semibold" style={{ background: COLORS.graphite, color: COLORS.offwhite }}>
                  <Mail size={18} /> Send via Email
                </a>
                <a href={waHref()} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 py-3 rounded-sm font-semibold" style={{ background: COLORS.amber, color: COLORS.graphite }}>
                  <MessageCircle size={18} /> Send via WhatsApp
                </a>
                <button onClick={() => setStep("form")} className="text-xs underline" style={{ color: "#6B7480" }}>Edit details</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
