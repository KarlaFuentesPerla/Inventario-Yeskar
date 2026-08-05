"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Product = { id: number; name: string; sku: string; category: string; stock: number; minStock: number; price: number; color: string };
type Delivery = { id: number; client: string; phone: string; date: string; time: string; address: string; items: string; status: "Pendiente" | "Confirmada" | "Entregada" };
type Tab = "inicio" | "inventario" | "agenda";

const demoProducts: Product[] = [
  { id: 1, name: "Vela Lavanda", sku: "VEL-001", category: "Velas", stock: 12, minStock: 5, price: 8.5, color: "#c9b8ff" },
  { id: 2, name: "Jabón de avena", sku: "JAB-004", category: "Cuidado", stock: 3, minStock: 6, price: 4, color: "#f2c879" },
  { id: 3, name: "Caja regalo", sku: "KIT-002", category: "Kits", stock: 8, minStock: 3, price: 18, color: "#f59b82" },
  { id: 4, name: "Aceite de rosas", sku: "ACE-003", category: "Cuidado", stock: 0, minStock: 4, price: 11.5, color: "#9fd8c7" },
];

const today = new Date();
const datePlus = (days: number) => { const d = new Date(today); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
const demoDeliveries: Delivery[] = [
  { id: 1, client: "Ana Martínez", phone: "7845-2210", date: datePlus(0), time: "10:30", address: "Col. Escalón, San Salvador", items: "2 × Vela Lavanda", status: "Confirmada" },
  { id: 2, client: "Carlos Méndez", phone: "7012-8890", date: datePlus(0), time: "15:00", address: "Santa Tecla", items: "1 × Caja regalo", status: "Pendiente" },
  { id: 3, client: "Sofía López", phone: "6123-4567", date: datePlus(1), time: "11:00", address: "Antiguo Cuscatlán", items: "3 × Jabón de avena", status: "Confirmada" },
];

function money(value: number) { return new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" }).format(value); }
function shortDate(value: string) { return new Intl.DateTimeFormat("es-SV", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00`)); }

export default function Home() {
  const [tab, setTab] = useState<Tab>("inicio");
  const [products, setProducts] = useState<Product[]>(demoProducts);
  const [deliveries, setDeliveries] = useState<Delivery[]>(demoDeliveries);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<"product" | "delivery" | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("tallercito-data");
    if (stored) { try { const parsed = JSON.parse(stored); setProducts(parsed.products); setDeliveries(parsed.deliveries); } catch {} }
  }, []);
  useEffect(() => { localStorage.setItem("tallercito-data", JSON.stringify({ products, deliveries })); }, [products, deliveries]);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(""), 2600); return () => clearTimeout(id); }, [toast]);

  const low = products.filter(p => p.stock <= p.minStock);
  const upcoming = deliveries.filter(d => d.status !== "Entregada").sort((a,b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const filtered = products.filter(p => `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(query.toLowerCase()));
  const inventoryValue = useMemo(() => products.reduce((sum, p) => sum + p.stock * p.price, 0), [products]);

  function addProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const fd = new FormData(e.currentTarget);
    setProducts(prev => [{ id: Date.now(), name: String(fd.get("name")), sku: String(fd.get("sku")), category: String(fd.get("category")), stock: Number(fd.get("stock")), minStock: Number(fd.get("minStock")), price: Number(fd.get("price")), color: "#9fd8c7" }, ...prev]);
    setModal(null); setToast("Producto agregado al inventario");
  }
  function addDelivery(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const fd = new FormData(e.currentTarget);
    setDeliveries(prev => [...prev, { id: Date.now(), client: String(fd.get("client")), phone: String(fd.get("phone")), date: String(fd.get("date")), time: String(fd.get("time")), address: String(fd.get("address")), items: String(fd.get("items")), status: "Pendiente" }]);
    setModal(null); setToast("Entrega agendada correctamente");
  }
  function cycleStatus(id: number) {
    setDeliveries(prev => prev.map(d => d.id === id ? { ...d, status: d.status === "Pendiente" ? "Confirmada" : d.status === "Confirmada" ? "Entregada" : "Pendiente" } : d));
    setToast("Estado de la entrega actualizado");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark">t</div><div><span className="eyebrow">MI EMPRENDIMIENTO</span><h1>tallercito.</h1></div>
        <button className="avatar" aria-label="Perfil">LM</button>
      </header>

      <div className="content">
        {tab === "inicio" && <>
          <section className="welcome"><div><p>{new Intl.DateTimeFormat("es-SV", { weekday: "long", day: "numeric", month: "long" }).format(today)}</p><h2>Buenos días, Laura <span>✦</span></h2><small>Todo listo para un día productivo.</small></div><div className="sun">☀</div></section>
          <section className="metric-grid">
            <article className="metric primary"><span className="metric-icon">▦</span><div><strong>{products.reduce((s,p) => s + p.stock, 0)}</strong><p>Unidades en stock</p></div><i>+4 esta semana</i></article>
            <article className="metric"><span className="metric-icon coral">!</span><div><strong>{low.length}</strong><p>Stock bajo</p></div><button onClick={() => setTab("inventario")}>Revisar →</button></article>
            <article className="metric"><span className="metric-icon gold">◷</span><div><strong>{upcoming.length}</strong><p>Entregas próximas</p></div><button onClick={() => setTab("agenda")}>Ver agenda →</button></article>
          </section>
          <section className="section-head"><div><span className="eyebrow">LO QUE SIGUE</span><h3>Próximas entregas</h3></div><button onClick={() => setTab("agenda")}>Ver todas</button></section>
          <div className="delivery-list">{upcoming.slice(0,3).map((d, i) => <DeliveryCard key={d.id} delivery={d} index={i} onStatus={cycleStatus} />)}</div>
          <section className="section-head stock-head"><div><span className="eyebrow">ATENCIÓN</span><h3>Necesitas reponer</h3></div><button onClick={() => setTab("inventario")}>Ir al inventario</button></section>
          <div className="low-stock-row">{low.map(p => <article key={p.id} className="mini-product"><div className="product-dot" style={{background:p.color}}>{p.name.charAt(0)}</div><div><strong>{p.name}</strong><small>{p.stock === 0 ? "Agotado" : `${p.stock} disponibles`}</small></div><span>mín. {p.minStock}</span></article>)}</div>
        </>}

        {tab === "inventario" && <>
          <section className="page-title"><div><span className="eyebrow">PRODUCTOS</span><h2>Tu inventario</h2><p>{products.length} productos · Valor {money(inventoryValue)}</p></div><button className="action" onClick={() => setModal("product")}>＋ Agregar</button></section>
          <label className="search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar producto o código…" /></label>
          <div className="chips"><button className="active">Todos <b>{products.length}</b></button><button onClick={()=>setQuery("Cuidado")}>Cuidado</button><button onClick={()=>setQuery("Velas")}>Velas</button><button onClick={()=>setQuery("Kits")}>Kits</button></div>
          <div className="product-list">{filtered.map(p => <article className="product-card" key={p.id}><div className="product-image" style={{background:p.color}}>{p.name.charAt(0)}</div><div className="product-info"><span>{p.category}</span><strong>{p.name}</strong><small>{p.sku} · {money(p.price)}</small></div><div className={`stock-pill ${p.stock === 0 ? "empty" : p.stock <= p.minStock ? "low" : ""}`}><b>{p.stock}</b><small>unid.</small></div><button className="more" aria-label={`Opciones para ${p.name}`}>···</button></article>)}</div>
        </>}

        {tab === "agenda" && <>
          <section className="page-title"><div><span className="eyebrow">ENTREGAS</span><h2>Tu agenda</h2><p>Organiza tus pedidos sin carreras.</p></div><button className="action" onClick={() => setModal("delivery")}>＋ Agendar</button></section>
          <div className="calendar-strip">{[0,1,2,3,4].map((n) => { const d=new Date(today); d.setDate(d.getDate()+n); return <button key={n} className={n===0?"active":""}><span>{new Intl.DateTimeFormat("es-SV",{weekday:"short"}).format(d).replace(".","")}</span><b>{d.getDate()}</b></button>})}</div>
          <section className="agenda-summary"><div><b>{upcoming.length}</b><span>pendientes</span></div><div><b>{deliveries.filter(d=>d.status==="Confirmada").length}</b><span>confirmadas</span></div><div><b>{deliveries.filter(d=>d.status==="Entregada").length}</b><span>completadas</span></div></section>
          <div className="date-group"><h3>Próximas entregas</h3>{deliveries.sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).map((d,i)=><DeliveryCard key={d.id} delivery={d} index={i} onStatus={cycleStatus} detailed />)}</div>
        </>}
      </div>

      <nav className="bottom-nav" aria-label="Navegación principal">
        <button className={tab==="inicio"?"active":""} onClick={()=>setTab("inicio")}><span>⌂</span>Inicio</button>
        <button className={tab==="inventario"?"active":""} onClick={()=>setTab("inventario")}><span>▦</span>Inventario</button>
        <button className="nav-add" onClick={()=>setModal(tab==="inventario"?"product":"delivery")} aria-label="Crear nuevo">＋</button>
        <button className={tab==="agenda"?"active":""} onClick={()=>setTab("agenda")}><span>□</span>Agenda</button>
        <button onClick={()=>setToast("Reportes disponibles próximamente")}><span>⌁</span>Reportes</button>
      </nav>

      {modal && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null)}}><section className="modal" role="dialog" aria-modal="true"><button className="close" onClick={()=>setModal(null)}>×</button>{modal === "product" ? <ProductForm onSubmit={addProduct}/> : <DeliveryForm onSubmit={addDelivery}/>}</section></div>}
      {toast && <div className="toast">✓ {toast}</div>}
    </main>
  );
}

function DeliveryCard({delivery:d,index,onStatus,detailed=false}:{delivery:Delivery,index:number,onStatus:(id:number)=>void,detailed?:boolean}) {
  return <article className={`delivery-card ${d.status === "Entregada" ? "done" : ""}`}><div className="time"><b>{d.time}</b><span>{shortDate(d.date)}</span></div><div className={`timeline c${index%3}`}></div><div className="delivery-body"><div><strong>{d.client}</strong><button className={`status ${d.status.toLowerCase()}`} onClick={()=>onStatus(d.id)}>{d.status}</button></div><p>{d.items}</p>{detailed && <><small>⌖ {d.address}</small><a href={`tel:${d.phone}`}>Llamar · {d.phone}</a></>}</div><button className="arrow" onClick={()=>onStatus(d.id)} aria-label="Cambiar estado">›</button></article>
}

function ProductForm({onSubmit}:{onSubmit:(e:FormEvent<HTMLFormElement>)=>void}) { return <form onSubmit={onSubmit}><span className="eyebrow">NUEVO PRODUCTO</span><h2>Agregar al inventario</h2><div className="form-grid"><label className="wide">Nombre<input required name="name" placeholder="Ej. Vela de vainilla" autoFocus /></label><label>Código<input required name="sku" placeholder="VEL-005" /></label><label>Categoría<select name="category"><option>Velas</option><option>Cuidado</option><option>Kits</option><option>Otro</option></select></label><label>Existencias<input required name="stock" type="number" min="0" defaultValue="1" /></label><label>Stock mínimo<input required name="minStock" type="number" min="0" defaultValue="3" /></label><label className="wide">Precio<input required name="price" type="number" min="0" step="0.01" placeholder="0.00" /></label></div><button className="submit">Guardar producto</button></form> }
function DeliveryForm({onSubmit}:{onSubmit:(e:FormEvent<HTMLFormElement>)=>void}) { return <form onSubmit={onSubmit}><span className="eyebrow">NUEVA CITA</span><h2>Agendar entrega</h2><div className="form-grid"><label className="wide">Cliente<input required name="client" placeholder="Nombre completo" autoFocus /></label><label>Fecha<input required name="date" type="date" defaultValue={datePlus(1)} /></label><label>Hora<input required name="time" type="time" defaultValue="10:00" /></label><label className="wide">Teléfono<input required name="phone" type="tel" placeholder="7000-0000" /></label><label className="wide">Pedido<input required name="items" placeholder="Ej. 2 × Caja regalo" /></label><label className="wide">Dirección<input required name="address" placeholder="Punto de entrega" /></label></div><button className="submit">Confirmar cita</button></form> }
