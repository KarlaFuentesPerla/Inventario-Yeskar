"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ProductStatus = "Disponible" | "Reservado" | "Vendido";
type SaleType = "General" | "Familia";
type Product = { id:number; name:string; category:string; cost:number; publicPrice:number; familyPrice:number; status:ProductStatus; saleType?:SaleType; soldPrice?:number; soldAt?:string };
type Delivery = { id:number; client:string; phone:string; date:string; time:string; address:string; details:string; price:number };
type Tab = "inicio" | "productos" | "agenda";

const now = new Date();
const isoDate = (date:Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
const datePlus = (days:number) => { const d=new Date(); d.setDate(d.getDate()+days); return isoDate(d); };
const demoProducts:Product[] = [
  {id:1,name:"Vela Lavanda",category:"Velas",cost:4.25,publicPrice:8.50,familyPrice:7,status:"Disponible"},
  {id:2,name:"Jabón de avena",category:"Cuidado",cost:1.75,publicPrice:4,familyPrice:3.25,status:"Reservado"},
  {id:3,name:"Caja regalo",category:"Regalos",cost:9,publicPrice:18,familyPrice:15,status:"Vendido",saleType:"General",soldPrice:18,soldAt:datePlus(-1)},
  {id:4,name:"Aceite de rosas",category:"Cuidado",cost:5.50,publicPrice:11.50,familyPrice:9.50,status:"Disponible"},
];
const demoDeliveries:Delivery[] = [
  {id:1,client:"Ana Martínez",phone:"7845-2210",date:datePlus(0),time:"10:30",address:"Colonia Escalón, San Salvador",details:"2 velas de lavanda",price:17},
  {id:2,client:"Carlos Méndez",phone:"7012-8890",date:datePlus(2),time:"15:00",address:"Santa Tecla",details:"1 caja de regalo",price:18},
];

const money=(n:number)=>new Intl.NumberFormat("es-SV",{style:"currency",currency:"USD"}).format(n||0);
const fullDate=(s:string)=>new Intl.DateTimeFormat("es-SV",{weekday:"long",day:"numeric",month:"long"}).format(new Date(`${s}T12:00:00`));

export default function Home(){
  const [tab,setTab]=useState<Tab>("inicio");
  const [products,setProducts]=useState<Product[]>(demoProducts);
  const [deliveries,setDeliveries]=useState<Delivery[]>(demoDeliveries);
  const [query,setQuery]=useState("");
  const [filter,setFilter]=useState<"Todos"|ProductStatus>("Todos");
  const [modal,setModal]=useState<"product"|"delivery"|"sell"|null>(null);
  const [editing,setEditing]=useState<Product|null>(null);
  const [selected,setSelected]=useState<Product|null>(null);
  const [toast,setToast]=useState("");
  const [selectedDate,setSelectedDate]=useState(isoDate(now));
  const [month,setMonth]=useState(new Date(now.getFullYear(),now.getMonth(),1));

  useEffect(()=>{const raw=localStorage.getItem("tallercito-v2");if(raw){try{const d=JSON.parse(raw);setProducts(d.products);setDeliveries(d.deliveries)}catch{}}},[]);
  useEffect(()=>{localStorage.setItem("tallercito-v2",JSON.stringify({products,deliveries}))},[products,deliveries]);
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(""),2800);return()=>clearTimeout(t)},[toast]);

  const sold=products.filter(p=>p.status==="Vendido");
  const invested=useMemo(()=>sold.reduce((s,p)=>s+p.cost,0),[sold]);
  const revenue=useMemo(()=>sold.reduce((s,p)=>s+(p.soldPrice??0),0),[sold]);
  const profit=revenue-invested;
  const upcoming=deliveries.filter(d=>d.date>=isoDate(now)).sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const filtered=products.filter(p=>(filter==="Todos"||p.status===filter)&&`${p.name} ${p.category}`.toLowerCase().includes(query.toLowerCase()));
  const dayDeliveries=deliveries.filter(d=>d.date===selectedDate).sort((a,b)=>a.time.localeCompare(b.time));

  function saveProduct(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const values={name:String(f.get("name")),category:String(f.get("category")),cost:Number(f.get("cost")),publicPrice:Number(f.get("publicPrice")),familyPrice:Number(f.get("familyPrice"))};if(editing){setProducts(x=>x.map(p=>p.id===editing.id?{...p,...values}:p));setToast("Producto actualizado")}else{setProducts(x=>[{id:Date.now(),status:"Disponible",...values},...x]);setToast("Producto agregado")};setEditing(null);setModal(null)}
  function saveDelivery(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);setDeliveries(x=>[...x,{id:Date.now(),client:String(f.get("client")),phone:String(f.get("phone")),date:String(f.get("date")),time:String(f.get("time")),address:String(f.get("address")),details:String(f.get("details")),price:Number(f.get("price"))}]);setSelectedDate(String(f.get("date")));setModal(null);setToast("Entrega agregada al calendario")}
  function setStatus(product:Product,status:ProductStatus){if(product.status==="Vendido")return;if(status==="Vendido"){setSelected(product);setModal("sell");return}setProducts(x=>x.map(p=>p.id===product.id?{...p,status}:p));setToast(status==="Reservado"?"Producto reservado":"Producto disponible nuevamente")}
  function confirmSale(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!selected)return;const f=new FormData(e.currentTarget);const saleType=String(f.get("saleType")) as SaleType;const soldPrice=saleType==="Familia"?selected.familyPrice:selected.publicPrice;setProducts(x=>x.map(p=>p.id===selected.id?{...p,status:"Vendido",saleType,soldPrice,soldAt:isoDate(now)}:p));setModal(null);setSelected(null);setToast(`Venta guardada. Ganancia: ${money(soldPrice-selected.cost)}`)}
  function openEdit(p:Product){setEditing(p);setModal("product")}
  function openDelivery(date=selectedDate){setSelectedDate(date);setModal("delivery")}

  return <main className="app-shell">
    <header className="topbar"><div className="brand-mark">T</div><div><span className="eyebrow">MI EMPRENDIMIENTO</span><h1>Tallercito</h1></div></header>
    <div className="content">
      {tab==="inicio"&&<>
        <section className="welcome"><p>{fullDate(isoDate(now))}</p><h2>Buenos días, Laura</h2><span>Aquí tienes lo más importante de hoy.</span></section>
        <section className="section-title"><h2>Resumen de ventas</h2><p>Calculado con los productos marcados como vendidos.</p></section>
        <div className="money-grid"><article><span>Dinero recogido</span><strong>{money(revenue)}</strong></article><article><span>Dinero gastado</span><strong>{money(invested)}</strong></article><article className="profit"><span>Ganancia total</span><strong>{money(profit)}</strong></article></div>
        <div className="home-actions"><button onClick={()=>{setEditing(null);setModal("product")}}><b>＋</b><span><strong>Agregar producto</strong><small>Registrar un artículo nuevo</small></span></button><button onClick={()=>openDelivery(isoDate(now))}><b>＋</b><span><strong>Agendar entrega</strong><small>Crear una cita en el calendario</small></span></button></div>
        <section className="section-title row"><div><h2>Próximas entregas</h2><p>{upcoming.length} entrega{upcoming.length===1?"":"s"} pendiente{upcoming.length===1?"":"s"}</p></div><button onClick={()=>setTab("agenda")}>Ver calendario</button></section>
        <div className="simple-list">{upcoming.slice(0,3).map(d=><DeliveryCard key={d.id} delivery={d}/>)}</div>
      </>}
      {tab==="productos"&&<>
        <section className="page-title"><div><h2>Productos</h2><p>Toca un producto para editarlo.</p></div><button className="action" onClick={()=>{setEditing(null);setModal("product")}}>＋ Agregar</button></section>
        <label className="search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar por nombre…" aria-label="Buscar productos"/></label>
        <div className="filters">{(["Todos","Disponible","Reservado","Vendido"] as const).map(x=><button key={x} className={filter===x?"active":""} onClick={()=>setFilter(x)}>{x}<b>{x==="Todos"?products.length:products.filter(p=>p.status===x).length}</b></button>)}</div>
        <div className="product-list">{filtered.map(p=><ProductCard key={p.id} product={p} onEdit={openEdit} onStatus={setStatus}/>)}</div>{!filtered.length&&<div className="empty"><b>No hay productos aquí</b><span>Prueba con otro filtro o agrega uno nuevo.</span></div>}
      </>}
      {tab==="agenda"&&<>
        <section className="page-title"><div><h2>Calendario</h2><p>Selecciona un día para ver sus entregas.</p></div><button className="action" onClick={()=>openDelivery()}>＋ Agregar</button></section>
        <Calendar month={month} selected={selectedDate} deliveries={deliveries} onMonth={setMonth} onSelect={setSelectedDate}/>
        <section className="selected-day"><div><span>ENTREGAS DEL DÍA</span><h2>{fullDate(selectedDate)}</h2></div><button onClick={()=>openDelivery()}>＋ Nueva entrega</button></section>
        <div className="simple-list">{dayDeliveries.map(d=><DeliveryCard key={d.id} delivery={d}/>)}</div>{!dayDeliveries.length&&<div className="empty calendar-empty"><b>No hay entregas este día</b><span>Puedes agregar una con el botón de arriba.</span></div>}
      </>}
    </div>
    <nav className="bottom-nav" aria-label="Navegación principal"><button className={tab==="inicio"?"active":""} onClick={()=>setTab("inicio")}><b>⌂</b><span>Inicio</span></button><button className={tab==="productos"?"active":""} onClick={()=>setTab("productos")}><b>▦</b><span>Productos</span></button><button className={tab==="agenda"?"active":""} onClick={()=>setTab("agenda")}><b>□</b><span>Calendario</span></button></nav>
    {modal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget){setModal(null);setEditing(null)}}}><section className="modal" role="dialog" aria-modal="true"><button className="close" onClick={()=>{setModal(null);setEditing(null)}} aria-label="Cerrar">×</button>{modal==="product"&&<ProductForm product={editing} onSubmit={saveProduct}/>} {modal==="delivery"&&<DeliveryForm date={selectedDate} onSubmit={saveDelivery}/>} {modal==="sell"&&selected&&<SellForm product={selected} onSubmit={confirmSale}/>}</section></div>}{toast&&<div className="toast">✓ {toast}</div>}
  </main>
}

function ProductCard({product:p,onEdit,onStatus}:{product:Product;onEdit:(p:Product)=>void;onStatus:(p:Product,s:ProductStatus)=>void}){const gain=(p.status==="Vendido"?p.soldPrice:p.publicPrice)!-p.cost;return <article className={`product-card ${p.status.toLowerCase()}`}><button className="product-main" onClick={()=>onEdit(p)} disabled={p.status==="Vendido"}><div className="product-image">{p.name.charAt(0)}</div><div><span className={`state ${p.status.toLowerCase()}`}>{p.status}</span><h3>{p.name}</h3><p>{p.category}</p></div><span className="edit-word">{p.status==="Vendido"?"Venta cerrada":"Editar"}</span></button><div className="prices"><span><small>Compra</small><b>{money(p.cost)}</b></span><span><small>{p.status==="Vendido"?`Venta ${p.saleType}`:"Venta general"}</small><b>{money(p.status==="Vendido"?p.soldPrice!:p.publicPrice)}</b></span><span className="gain"><small>Ganancia</small><b>{money(gain)}</b></span></div>{p.status!=="Vendido"&&<div className="status-actions">{p.status==="Disponible"?<><button className="reserve" onClick={()=>onStatus(p,"Reservado")}>Reservar</button><button className="sell" onClick={()=>onStatus(p,"Vendido")}>Marcar vendido</button></>:<><button className="release" onClick={()=>onStatus(p,"Disponible")}>Volver a disponible</button><button className="sell" onClick={()=>onStatus(p,"Vendido")}>Marcar vendido</button></>}</div>}{p.status==="Vendido"&&<div className="locked">✓ Vendido · Este estado ya no se puede cambiar</div>}</article>}

function Calendar({month,selected,deliveries,onMonth,onSelect}:{month:Date;selected:string;deliveries:Delivery[];onMonth:(d:Date)=>void;onSelect:(s:string)=>void}){const year=month.getFullYear(),m=month.getMonth(),days=new Date(year,m+1,0).getDate();let start=new Date(year,m,1).getDay();start=start===0?6:start-1;const cells:Array<Date|null>=[...Array(start).fill(null),...Array.from({length:days},(_,i)=>new Date(year,m,i+1))];while(cells.length%7)cells.push(null);const monthName=new Intl.DateTimeFormat("es-SV",{month:"long",year:"numeric"}).format(month);return <section className="calendar"><header><button onClick={()=>onMonth(new Date(year,m-1,1))} aria-label="Mes anterior">‹</button><h3>{monthName}</h3><button onClick={()=>onMonth(new Date(year,m+1,1))} aria-label="Mes siguiente">›</button></header><div className="weekdays">{["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(x=><span key={x}>{x}</span>)}</div><div className="days">{cells.map((d,i)=>d?<button key={i} className={`${isoDate(d)===selected?"selected":""} ${isoDate(d)===isoDate(now)?"today":""}`} onClick={()=>onSelect(isoDate(d))}><b>{d.getDate()}</b>{deliveries.some(x=>x.date===isoDate(d))&&<i>{deliveries.filter(x=>x.date===isoDate(d)).length}</i>}</button>:<span key={i}/>)}</div><button className="today-button" onClick={()=>{onMonth(new Date(now.getFullYear(),now.getMonth(),1));onSelect(isoDate(now))}}>Ir a hoy</button></section>}
function DeliveryCard({delivery:d}:{delivery:Delivery}){return <article className="delivery-card"><div className="date-block"><b>{d.time}</b><span>{money(d.price)}</span></div><div><h3>{d.client}</h3><p>{d.details}</p><small>{d.address}</small><a href={`tel:${d.phone}`}>Llamar al {d.phone}</a></div></article>}
function ProductForm({product,onSubmit}:{product:Product|null;onSubmit:(e:FormEvent<HTMLFormElement>)=>void}){const [cost,setCost]=useState(product?.cost??0),[general,setGeneral]=useState(product?.publicPrice??0),[family,setFamily]=useState(product?.familyPrice??0);return <form onSubmit={onSubmit}><span className="eyebrow">{product?"EDITAR PRODUCTO":"NUEVO PRODUCTO"}</span><h2>{product?product.name:"Agregar producto"}</h2><div className="form-grid"><label className="wide">Nombre del producto<input required name="name" defaultValue={product?.name} placeholder="Ejemplo: Vela de vainilla" autoFocus/></label><label className="wide">Categoría<input required name="category" defaultValue={product?.category} placeholder="Ejemplo: Velas"/></label><label className="wide">Precio de compra<input required name="cost" type="number" min="0" step="0.01" value={cost} onChange={e=>setCost(Number(e.target.value))}/></label><label>Venta general<input required name="publicPrice" type="number" min="0" step="0.01" value={general} onChange={e=>setGeneral(Number(e.target.value))}/><small className="calculated">Ganancia: {money(general-cost)}</small></label><label>Venta familia<input required name="familyPrice" type="number" min="0" step="0.01" value={family} onChange={e=>setFamily(Number(e.target.value))}/><small className="calculated">Ganancia: {money(family-cost)}</small></label></div><button className="submit">{product?"Guardar cambios":"Agregar producto"}</button></form>}
function DeliveryForm({date,onSubmit}:{date:string;onSubmit:(e:FormEvent<HTMLFormElement>)=>void}){return <form onSubmit={onSubmit}><span className="eyebrow">NUEVA ENTREGA</span><h2>Agendar una cita</h2><div className="form-grid"><label>Fecha<input required name="date" type="date" defaultValue={date}/></label><label>Hora<input required name="time" type="time" defaultValue="10:00"/></label><label className="wide">Nombre del cliente<input required name="client" placeholder="Nombre completo" autoFocus/></label><label className="wide">Precio de la entrega<input required name="price" type="number" min="0" step="0.01" placeholder="0.00"/></label><label className="wide">Teléfono<input required name="phone" type="tel" placeholder="7000-0000"/></label><label className="wide">¿Qué se entregará?<input required name="details" placeholder="Ejemplo: 2 velas de lavanda"/></label><label className="wide">Lugar de entrega<input required name="address" placeholder="Dirección o punto de referencia"/></label></div><button className="submit">Agregar al calendario</button></form>}
function SellForm({product:p,onSubmit}:{product:Product;onSubmit:(e:FormEvent<HTMLFormElement>)=>void}){const [type,setType]=useState<SaleType>("General"),price=type==="General"?p.publicPrice:p.familyPrice;return <form onSubmit={onSubmit}><span className="eyebrow">CONFIRMAR VENTA</span><h2>{p.name}</h2><p className="warning">Después de confirmar, el producto quedará vendido y no podrá cambiarse.</p><fieldset><legend>¿A quién se vendió?</legend><label className={type==="General"?"chosen":""}><input type="radio" name="saleType" value="General" checked={type==="General"} onChange={()=>setType("General")}/><span><b>Público general</b><small>Precio: {money(p.publicPrice)}</small></span></label><label className={type==="Familia"?"chosen":""}><input type="radio" name="saleType" value="Familia" checked={type==="Familia"} onChange={()=>setType("Familia")}/><span><b>Familia</b><small>Precio: {money(p.familyPrice)}</small></span></label></fieldset><div className="sale-summary"><span>Costo: <b>{money(p.cost)}</b></span><span>Recibido: <b>{money(price)}</b></span><strong>Ganancia: {money(price-p.cost)}</strong></div><button className="submit danger">Confirmar como vendido</button></form>}
