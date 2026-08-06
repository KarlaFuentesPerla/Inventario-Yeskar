"use client";

import { FormEvent, useEffect, useState } from "react";

type SaleType = "General" | "Familia";
type Product = { id:number; name:string; category:string; quantity:number; cost:number; publicPrice:number; familyPrice:number; soldQuantity:number; salesRevenue:number; status?:string; saleType?:SaleType; soldPrice?:number };
type Reservation = { id:number; productId:number; quantity:number; saleType:SaleType; createdAt:string; deliveryId?:number };
type DeliveryMode = "Propio" | "Empresa";
type Delivery = { id:number; client:string; phone:string; date:string; time:string; address:string; details:string; price:number; reservationId?:number; productId?:number; quantity?:number; saleType?:SaleType; mode?:DeliveryMode; handoffDate?:string; company?:string; remuneration?:number; collectedAt?:string; remunerationWithdrawn?:boolean };
type Tab = "inicio" | "productos" | "agenda";

const now = new Date();
const isoDate = (date:Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
const datePlus = (days:number) => { const d=new Date(); d.setDate(d.getDate()+days); return isoDate(d); };
const demoProducts:Product[] = [];
const demoDeliveries:Delivery[] = [];

const money=(n:number)=>new Intl.NumberFormat("es-SV",{style:"currency",currency:"USD"}).format(n||0);
const fullDate=(s:string)=>new Intl.DateTimeFormat("es-SV",{weekday:"long",day:"numeric",month:"long"}).format(new Date(`${s}T12:00:00`));

export default function Home(){
  const [tab,setTab]=useState<Tab>("inicio");
  const [products,setProducts]=useState<Product[]>(demoProducts);
  const [reservations,setReservations]=useState<Reservation[]>([]);
  const [categories,setCategories]=useState<string[]>([]);
  const [deliveries,setDeliveries]=useState<Delivery[]>(demoDeliveries);
  const [query,setQuery]=useState("");
  const [productView,setProductView]=useState<"inventory"|"reserved">("inventory");
  const [modal,setModal]=useState<"product"|"delivery"|"movement"|null>(null);
  const [movementType,setMovementType]=useState<"sale"|"reserve">("sale");
  const [editing,setEditing]=useState<Product|null>(null);
  const [selected,setSelected]=useState<Product|null>(null);
  const [toast,setToast]=useState("");
  const [selectedDate,setSelectedDate]=useState(isoDate(now));
  const [month,setMonth]=useState(new Date(now.getFullYear(),now.getMonth(),1));

  useEffect(()=>{const raw=localStorage.getItem("tallercito-v2");if(raw){try{const d=JSON.parse(raw);const migratedReservations:Reservation[]=d.reservations??[];const loaded:Product[]=d.products.map((p:Product)=>{const quantity=p.quantity??1;const wasSold=p.status==="Vendido";if(p.status==="Reservado"&&!migratedReservations.some(r=>r.productId===p.id))migratedReservations.push({id:Date.now()+p.id,productId:p.id,quantity,saleType:"General",createdAt:isoDate(now)});return{...p,quantity,soldQuantity:p.soldQuantity??(wasSold?quantity:0),salesRevenue:p.salesRevenue??(wasSold?(p.soldPrice??p.publicPrice)*quantity:0)}});setProducts(loaded);setReservations(migratedReservations);setDeliveries(d.deliveries);setCategories(d.categories??Array.from(new Set(loaded.map(p=>p.category))))}catch{}}},[]);
  useEffect(()=>{localStorage.setItem("tallercito-v2",JSON.stringify({products,deliveries,categories,reservations}))},[products,deliveries,categories,reservations]);
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(""),2800);return()=>clearTimeout(t)},[toast]);

  const upcoming=deliveries.filter(d=>d.date>=isoDate(now)).sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const filtered=products.filter(p=>`${p.name} ${p.category}`.toLowerCase().includes(query.toLowerCase()));
  const dayDeliveries=deliveries.filter(d=>d.date===selectedDate).sort((a,b)=>a.time.localeCompare(b.time));
  const payoutReminders=deliveries.filter(d=>d.mode==="Empresa"&&d.collectedAt&&d.remuneration&&!d.remunerationWithdrawn).map(d=>({...d,dueAt:new Date(new Date(d.collectedAt!).getTime()+48*60*60*1000)}));

  function saveProduct(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const newCategory=String(f.get("newCategory")||"").trim();const category=newCategory||String(f.get("category"));const values={name:String(f.get("name")),category,quantity:Number(f.get("quantity")),cost:Number(f.get("cost")),publicPrice:Number(f.get("publicPrice")),familyPrice:Number(f.get("familyPrice"))};if(newCategory&&!categories.includes(newCategory))setCategories(x=>[...x,newCategory].sort());if(editing){setProducts(x=>x.map(p=>p.id===editing.id?{...p,...values}:p));setToast("Producto actualizado")}else{setProducts(x=>[{id:Date.now(),soldQuantity:0,salesRevenue:0,...values},...x]);setToast("Producto agregado")};setEditing(null);setModal(null)}
  function saveDelivery(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget),productId=Number(f.get("productId")),quantity=Number(f.get("quantity")),saleType=String(f.get("saleType")) as SaleType,p=products.find(x=>x.id===productId);if(!p||quantity<1||quantity>availableFor(p))return;const reservationId=Date.now(),deliveryId=reservationId+1,price=(saleType==="Familia"?p.familyPrice:p.publicPrice)*quantity,mode=String(f.get("mode")) as DeliveryMode,date=String(mode==="Empresa"?f.get("pickupDate"):f.get("date")),time=String(mode==="Empresa"?f.get("pickupTime"):f.get("time"));setReservations(x=>[...x,{id:reservationId,productId,quantity,saleType,createdAt:isoDate(now),deliveryId}]);setDeliveries(x=>[...x,{id:deliveryId,reservationId,productId,quantity,saleType,mode,client:String(f.get("client")),phone:String(f.get("phone")),date,time,address:String(f.get("address")),details:`${quantity} × ${p.name}`,price,handoffDate:mode==="Empresa"?String(f.get("handoffDate")):undefined,company:mode==="Empresa"?String(f.get("company")):undefined,remuneration:mode==="Empresa"?Number(f.get("remuneration")):0}]);setSelectedDate(date);setModal(null);setToast("Entrega agendada y producto reservado")}
  const reservedFor=(id:number)=>reservations.filter(r=>r.productId===id).reduce((s,r)=>s+r.quantity,0);
  const availableFor=(p:Product)=>Math.max(0,p.quantity-p.soldQuantity-reservedFor(p.id));
  function openMovement(p:Product,type:"sale"|"reserve"){setSelected(p);setMovementType(type);setModal("movement")}
  function confirmMovement(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!selected)return;const f=new FormData(e.currentTarget),quantity=Number(f.get("quantity")),saleType=String(f.get("saleType")) as SaleType;if(quantity<1||quantity>availableFor(selected))return;const price=saleType==="Familia"?selected.familyPrice:selected.publicPrice;if(movementType==="reserve"){const reservationId=Date.now(),deliveryId=reservationId+1,mode=String(f.get("mode")) as DeliveryMode,date=String(mode==="Empresa"?f.get("pickupDate"):f.get("date")),time=String(mode==="Empresa"?f.get("pickupTime"):f.get("time"));setReservations(x=>[...x,{id:reservationId,productId:selected.id,quantity,saleType,createdAt:isoDate(now),deliveryId}]);setDeliveries(x=>[...x,{id:deliveryId,reservationId,productId:selected.id,quantity,saleType,mode,client:String(f.get("client")),phone:String(f.get("phone")),date,time,address:String(f.get("address")),details:`${quantity} × ${selected.name}`,price:price*quantity,handoffDate:mode==="Empresa"?String(f.get("handoffDate")):undefined,company:mode==="Empresa"?String(f.get("company")):undefined,remuneration:mode==="Empresa"?Number(f.get("remuneration")):0}]);setToast("Reserva creada y entrega agregada al calendario")}else{setProducts(x=>x.map(p=>p.id===selected.id?{...p,soldQuantity:p.soldQuantity+quantity,salesRevenue:p.salesRevenue+price*quantity}:p));setToast(`Venta guardada. Ganancia: ${money((price-selected.cost)*quantity)}`)}setModal(null);setSelected(null)}
  function completeReservation(r:Reservation){const p=products.find(x=>x.id===r.productId);if(!p)return;const price=r.saleType==="Familia"?p.familyPrice:p.publicPrice;setProducts(x=>x.map(item=>item.id===p.id?{...item,soldQuantity:item.soldQuantity+r.quantity,salesRevenue:item.salesRevenue+price*r.quantity}:item));setReservations(x=>x.filter(item=>item.id!==r.id));if(r.deliveryId)setDeliveries(x=>x.map(d=>d.id===r.deliveryId?{...d,collectedAt:new Date().toISOString()}:d));setToast("Cliente recogió: venta e inventario actualizados")}
  function withdrawRemuneration(id:number){setDeliveries(x=>x.map(d=>d.id===id?{...d,remunerationWithdrawn:true}:d));setToast("Remuneración marcada como retirada")}
  function releaseReservation(r:Reservation){setReservations(x=>x.filter(item=>item.id!==r.id));if(r.deliveryId)setDeliveries(x=>x.filter(d=>d.id!==r.deliveryId));setToast("Reserva liberada y entrega retirada del calendario")}
  function openEdit(p:Product){setEditing(p);setModal("product")}
  function openDelivery(date=selectedDate){setSelectedDate(date);setModal("delivery")}
  function removeProductFromApp(product:Product){
    if(!window.confirm(`¿Quitar ${product.name} de la aplicación? Esta acción no borra datos de Supabase.`))return;
    const linkedReservationIds=reservations.filter(r=>r.productId===product.id).map(r=>r.id);
    setProducts(x=>x.filter(p=>p.id!==product.id));
    setReservations(x=>x.filter(r=>r.productId!==product.id));
    setDeliveries(x=>x.filter(d=>d.productId!==product.id&&!linkedReservationIds.includes(d.reservationId??-1)));
    setEditing(null);setModal(null);setToast("Producto retirado de esta aplicación");
  }
  function removeCategoryFromApp(category:string){
    if(!category||!window.confirm(`¿Quitar la categoría ${category}? Los productos pasarán a “Sin categoría”.`))return;
    const fallback="Sin categoría";
    setProducts(x=>x.map(p=>p.category===category?{...p,category:fallback}:p));
    setCategories(x=>Array.from(new Set([...x.filter(c=>c!==category),fallback])).sort());
    setEditing(null);setModal(null);setToast("Categoría retirada de esta aplicación");
  }

  return <main className="app-shell">
    <header className="topbar"><div className="brand-mark">Y</div><div><span className="eyebrow">MI EMPRENDIMIENTO</span><h1>Variedades YesKar</h1></div></header>
    <div className="content">
      {tab==="inicio"&&<>
        <section className="welcome"><div className="welcome-copy"><p>{fullDate(isoDate(now))}</p><h2>¡Hola, Yesi!</h2><span>Aquí tienes lo más importante de hoy.</span></div><img className="mascot" src="/images/yeskar-elephant-v2.png" alt="Elefantito con mochila, mascota de Variedades YesKar"/></section>
        {payoutReminders.length>0&&<section className="payout-section"><h2>Remuneraciones por retirar</h2>{payoutReminders.map(d=><article className={d.dueAt<=new Date()?"due":""} key={d.id}><div><span>{d.dueAt<=new Date()?"YA PUEDES RETIRAR":"DISPONIBLE PRÓXIMAMENTE"}</span><strong>{money(d.remuneration!)} · {d.company}</strong><small>Retirar después del {new Intl.DateTimeFormat("es-SV",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"}).format(d.dueAt)}</small></div><button disabled={d.dueAt>new Date()} onClick={()=>withdrawRemuneration(d.id)}>Marcar retirada</button></article>)}</section>}
        <div className="home-actions"><button onClick={()=>{setEditing(null);setModal("product")}}><b>＋</b><span><strong>Agregar producto</strong><small>Registrar un artículo nuevo</small></span></button><button onClick={()=>openDelivery(isoDate(now))}><b>＋</b><span><strong>Agendar entrega</strong><small>Crear una cita en el calendario</small></span></button></div>
        <section className="section-title row"><div><h2>Próximas entregas</h2><p>{upcoming.length} entrega{upcoming.length===1?"":"s"} pendiente{upcoming.length===1?"":"s"}</p></div><button onClick={()=>setTab("agenda")}>Ver calendario</button></section>
        <div className="simple-list">{upcoming.slice(0,3).map(d=><DeliveryCard key={d.id} delivery={d}/>)}</div>
      </>}
      {tab==="productos"&&<>
        <section className="page-title"><div><h2>Productos</h2><p>{products.reduce((sum,p)=>sum+availableFor(p),0)} unidades disponibles.</p></div><button className="action" onClick={()=>{setEditing(null);setModal("product")}}>＋ Agregar</button></section>
        <section className="current-investment"><span>TOTAL INVERTIDO ACTUALMENTE</span><strong>{money(products.reduce((sum,p)=>sum+p.cost*availableFor(p),0))}</strong><small>Calculado con las unidades disponibles.</small></section>
        <div className="product-tabs"><button className={productView==="inventory"?"active":""} onClick={()=>setProductView("inventory")}>Inventario</button><button className={productView==="reserved"?"active":""} onClick={()=>setProductView("reserved")}>Reservados <b>{reservations.reduce((s,r)=>s+r.quantity,0)}</b></button></div>
        {productView==="inventory"?<><label className="search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar por nombre…" aria-label="Buscar productos"/></label><div className="category-line">{categories.map(c=><span key={c}>{c}</span>)}</div><div className="product-list">{filtered.map(p=><ProductCard key={p.id} product={p} available={availableFor(p)} reserved={reservedFor(p.id)} onEdit={openEdit} onMovement={openMovement}/>)}</div>{!filtered.length&&<div className="empty"><b>No hay productos aquí</b><span>Prueba otra búsqueda o agrega uno nuevo.</span></div>}</>:<ReservedList reservations={reservations} products={products} deliveries={deliveries} onComplete={completeReservation} onRelease={releaseReservation}/>} 
      </>}
      {tab==="agenda"&&<>
        <section className="page-title"><div><h2>Calendario</h2><p>Selecciona un día para ver sus entregas.</p></div><button className="action" onClick={()=>openDelivery()}>＋ Agregar</button></section>
        <Calendar month={month} selected={selectedDate} deliveries={deliveries} onMonth={setMonth} onSelect={setSelectedDate}/>
        <section className="selected-day"><div><span>ENTREGAS DEL DÍA</span><h2>{fullDate(selectedDate)}</h2></div><button onClick={()=>openDelivery()}>＋ Nueva entrega</button></section>
        <div className="simple-list">{dayDeliveries.map(d=><DeliveryCard key={d.id} delivery={d}/>)}</div>{!dayDeliveries.length&&<div className="empty calendar-empty"><b>No hay entregas este día</b><span>Puedes agregar una con el botón de arriba.</span></div>}
      </>}
    </div>
    <nav className="bottom-nav" aria-label="Navegación principal"><button className={tab==="inicio"?"active":""} onClick={()=>setTab("inicio")}><b>⌂</b><span>Inicio</span></button><button className={tab==="productos"?"active":""} onClick={()=>setTab("productos")}><b>▦</b><span>Productos</span></button><button className={tab==="agenda"?"active":""} onClick={()=>setTab("agenda")}><b>□</b><span>Calendario</span></button></nav>
    {modal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget){setModal(null);setEditing(null)}}}><section className="modal" role="dialog" aria-modal="true"><button className="close" onClick={()=>{setModal(null);setEditing(null)}} aria-label="Cerrar">×</button>{modal==="product"&&<ProductForm product={editing} categories={categories} onSubmit={saveProduct} onDeleteProduct={removeProductFromApp} onDeleteCategory={removeCategoryFromApp}/>} {modal==="delivery"&&<DeliveryForm date={selectedDate} products={products} availableFor={availableFor} onSubmit={saveDelivery}/>} {modal==="movement"&&selected&&<MovementForm product={selected} available={availableFor(selected)} type={movementType} onSubmit={confirmMovement}/>}</section></div>}{toast&&<div className="toast">✓ {toast}</div>}
  </main>
}

function ProductCard({product:p,available,reserved,onEdit,onMovement}:{product:Product;available:number;reserved:number;onEdit:(p:Product)=>void;onMovement:(p:Product,t:"sale"|"reserve")=>void}){return <article className="product-card"><button className="product-main" onClick={()=>onEdit(p)}><div className="product-image">{p.name.charAt(0)}</div><div><span className={`state ${available?"disponible":"vendido"}`}>{available?"Disponible":"Agotado"}</span><h3>{p.name}</h3><p>{p.category}{reserved?` · ${reserved} reservadas`:""}</p></div><span className="quantity"><b>{available}</b><small>disponibles</small></span></button><div className="prices"><span><small>Compra por unidad</small><b>{money(p.cost)}</b></span><span><small>Venta general</small><b>{money(p.publicPrice)}</b></span><span className="gain"><small>Venta familia</small><b>{money(p.familyPrice)}</b></span></div><div className="product-investment"><span>Total invertido en este producto</span><strong>{money(available*p.cost)}</strong></div><button className="edit-product" onClick={()=>onEdit(p)}>Editar producto y cantidad</button><div className="status-actions"><button className="reserve" disabled={!available} onClick={()=>onMovement(p,"reserve")}>Reserva</button><button className="sell" disabled={!available} onClick={()=>onMovement(p,"sale")}>Venta</button></div>{p.soldQuantity>0&&<div className="sold-note">{p.soldQuantity} unidad{p.soldQuantity===1?"":"es"} vendida{p.soldQuantity===1?"":"s"} hasta ahora</div>}</article>}

function ReservedList({reservations,products,deliveries,onComplete,onRelease}:{reservations:Reservation[];products:Product[];deliveries:Delivery[];onComplete:(r:Reservation)=>void;onRelease:(r:Reservation)=>void}){if(!reservations.length)return <div className="empty reserved-empty"><b>No hay productos reservados</b><span>Las nuevas reservas aparecerán aquí.</span></div>;return <div className="reserved-list">{reservations.map(r=>{const p=products.find(x=>x.id===r.productId),d=deliveries.find(x=>x.id===r.deliveryId);if(!p)return null;const price=r.saleType==="Familia"?p.familyPrice:p.publicPrice;return <article className="reserved-card" key={r.id}><header><div className="product-image">{p.name.charAt(0)}</div><div><span>RESERVADO · {r.saleType}</span><h3>{p.name}</h3><p>{r.quantity} unidad{r.quantity===1?"":"es"} · Total {money(price*r.quantity)}</p>{d&&<small className="pickup-date">Recolección: {fullDate(d.date)} a las {d.time}{d.mode==="Empresa"?` · ${d.company}`:""}</small>}</div></header><div className="reserved-actions"><button onClick={()=>onRelease(r)}>No lo recogió</button><button className="complete" onClick={()=>onComplete(r)}>Cliente recogió</button></div></article>})}</div>}

function Calendar({month,selected,deliveries,onMonth,onSelect}:{month:Date;selected:string;deliveries:Delivery[];onMonth:(d:Date)=>void;onSelect:(s:string)=>void}){const year=month.getFullYear(),m=month.getMonth(),days=new Date(year,m+1,0).getDate();let start=new Date(year,m,1).getDay();start=start===0?6:start-1;const cells:Array<Date|null>=[...Array(start).fill(null),...Array.from({length:days},(_,i)=>new Date(year,m,i+1))];while(cells.length%7)cells.push(null);const monthName=new Intl.DateTimeFormat("es-SV",{month:"long",year:"numeric"}).format(month);return <section className="calendar"><header><button onClick={()=>onMonth(new Date(year,m-1,1))} aria-label="Mes anterior">‹</button><h3>{monthName}</h3><button onClick={()=>onMonth(new Date(year,m+1,1))} aria-label="Mes siguiente">›</button></header><div className="weekdays">{["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(x=><span key={x}>{x}</span>)}</div><div className="days">{cells.map((d,i)=>d?<button key={i} className={`${isoDate(d)===selected?"selected":""} ${isoDate(d)===isoDate(now)?"today":""}`} onClick={()=>onSelect(isoDate(d))}><b>{d.getDate()}</b>{deliveries.some(x=>x.date===isoDate(d))&&<i>{deliveries.filter(x=>x.date===isoDate(d)).length}</i>}</button>:<span key={i}/>)}</div><button className="today-button" onClick={()=>{onMonth(new Date(now.getFullYear(),now.getMonth(),1));onSelect(isoDate(now))}}>Ir a hoy</button></section>}
function DeliveryCard({delivery:d}:{delivery:Delivery}){return <article className="delivery-card"><div className="date-block"><b>{d.time}</b><span>{money(d.price)}</span></div><div><span className="delivery-mode">{d.mode==="Empresa"?`Envío · ${d.company}`:"Entrega propia"}</span><h3>{d.client}</h3><p>{d.details}</p>{d.mode==="Empresa"&&<small>Entregar a empresa: {d.handoffDate}</small>}<small>{d.address}</small><a href={`tel:${d.phone}`}>Llamar al {d.phone}</a></div></article>}
function ProductForm({product,categories,onSubmit,onDeleteProduct,onDeleteCategory}:{product:Product|null;categories:string[];onSubmit:(e:FormEvent<HTMLFormElement>)=>void;onDeleteProduct:(p:Product)=>void;onDeleteCategory:(category:string)=>void}){
  const [cost,setCost]=useState(product?String(product.cost):"");
  const [general,setGeneral]=useState(product?String(product.publicPrice):"");
  const [family,setFamily]=useState(product?String(product.familyPrice):"");
  const [isNew,setIsNew]=useState(categories.length===0);
  const [selectedCategory,setSelectedCategory]=useState(product?.category??categories[0]??"");
  return <form onSubmit={onSubmit}>
    <span className="eyebrow">{product?"EDITAR PRODUCTO":"NUEVO PRODUCTO"}</span>
    <h2>{product?product.name:"Agregar producto"}</h2>
    <div className="form-grid">
      <label className="wide">Nombre del producto<input required name="name" defaultValue={product?.name} placeholder="Ejemplo: Vela de vainilla" autoFocus/></label>
      <label className="wide">Cantidad<input required name="quantity" type="number" min="1" step="1" defaultValue={product?.quantity}/><small className="field-help">¿Cuántas unidades iguales tienes?</small></label>
      <label className="wide">Categoría<select required={!isNew} name="category" value={selectedCategory} disabled={isNew} onChange={e=>setSelectedCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select><button type="button" className="new-category-button" onClick={()=>setIsNew(!isNew)}>{isNew?"Elegir una existente":"＋ Crear categoría nueva"}</button></label>
      {isNew&&<label className="wide new-category">Nombre de la categoría<input required name="newCategory" placeholder="Ejemplo: Accesorios"/></label>}
      <label className="wide">Precio de compra por unidad<input required name="cost" type="number" min="0" step="0.01" value={cost} onChange={e=>setCost(e.target.value)}/></label>
      <label>Venta general<input required name="publicPrice" type="number" min="0" step="0.01" value={general} onChange={e=>setGeneral(e.target.value)}/><small className="calculated">Ganancia por unidad: {money((Number(general)||0)-(Number(cost)||0))}</small></label>
      <label>Venta familia<input required name="familyPrice" type="number" min="0" step="0.01" value={family} onChange={e=>setFamily(e.target.value)}/><small className="calculated">Ganancia por unidad: {money((Number(family)||0)-(Number(cost)||0))}</small></label>
    </div>
    <button className="submit">{product?"Guardar cambios":"Agregar producto"}</button>
    <details className="delete-options">
      <summary>Más opciones</summary>
      <p>Estas acciones solo retiran información de esta aplicación.</p>
      {!isNew&&selectedCategory&&<button type="button" onClick={()=>onDeleteCategory(selectedCategory)}>Eliminar categoría “{selectedCategory}”</button>}
      {product&&<button type="button" className="delete-product-button" onClick={()=>onDeleteProduct(product)}>Eliminar producto</button>}
    </details>
  </form>
}
function DeliveryForm({date,products,availableFor,onSubmit}:{date:string;products:Product[];availableFor:(p:Product)=>number;onSubmit:(e:FormEvent<HTMLFormElement>)=>void}){
  const choices=products.filter(p=>availableFor(p)>0);
  const [productId,setProductId]=useState(choices[0]?.id??0);
  const [saleType,setSaleType]=useState<SaleType>("General");
  const [quantity,setQuantity]=useState("");
  const [mode,setMode]=useState<DeliveryMode>("Propio");
  const p=products.find(x=>x.id===productId),available=p?availableFor(p):0,price=p?(saleType==="Familia"?p.familyPrice:p.publicPrice):0;
  const quantityNumber=Number(quantity)||0;
  return <form onSubmit={onSubmit}><span className="eyebrow">NUEVA ENTREGA Y RESERVA</span><h2>Agendar una entrega</h2><div className="linked-notice">Al guardar, el producto quedará reservado automáticamente.</div><DeliveryModeFields mode={mode} setMode={setMode} date={date}/><div className="form-grid"><label className="wide">Producto<select required name="productId" value={productId} onChange={e=>{setProductId(Number(e.target.value));setQuantity("")}}>{choices.map(x=><option value={x.id} key={x.id}>{x.name} · {availableFor(x)} disponibles</option>)}</select></label><label>Cantidad<input required name="quantity" type="number" min="1" max={available} value={quantity} onChange={e=>setQuantity(e.target.value)}/></label><label>Tipo de precio<select name="saleType" value={saleType} onChange={e=>setSaleType(e.target.value as SaleType)}><option>General</option><option>Familia</option></select></label><div className="wide delivery-total">Total de la entrega: <b>{money(price*quantityNumber)}</b></div><label className="wide">Nombre del cliente<input required name="client" placeholder="Nombre completo" autoFocus/></label><label className="wide">Teléfono<input required name="phone" type="tel" placeholder="7000-0000"/></label><label className="wide">Lugar de entrega<input required name="address" placeholder="Dirección o punto de referencia"/></label></div><button className="submit" disabled={!choices.length}>Reservar y agregar al calendario</button></form>
}
function MovementForm({product:p,available,type,onSubmit}:{product:Product;available:number;type:"sale"|"reserve";onSubmit:(e:FormEvent<HTMLFormElement>)=>void}){
  const [saleType,setSaleType]=useState<SaleType>("General");
  const [quantity,setQuantity]=useState("");
  const [mode,setMode]=useState<DeliveryMode>("Propio");
  const quantityNumber=Number(quantity)||0;
  const price=saleType==="General"?p.publicPrice:p.familyPrice;
  return <form onSubmit={onSubmit}><span className="eyebrow">{type==="sale"?"NUEVA VENTA":"NUEVA RESERVA Y ENTREGA"}</span><h2>{p.name}</h2><p className="movement-available">Tienes <b>{available} unidades disponibles</b></p><label className="movement-quantity">Cantidad<input required name="quantity" type="number" min="1" max={available} value={quantity} onChange={e=>setQuantity(e.target.value)}/></label><fieldset><legend>¿Precio para quién?</legend><label className={saleType==="General"?"chosen":""}><input type="radio" name="saleType" value="General" checked={saleType==="General"} onChange={()=>setSaleType("General")}/><span><b>Público general</b><small>{money(p.publicPrice)} por unidad</small></span></label><label className={saleType==="Familia"?"chosen":""}><input type="radio" name="saleType" value="Familia" checked={saleType==="Familia"} onChange={()=>setSaleType("Familia")}/><span><b>Familia</b><small>{money(p.familyPrice)} por unidad</small></span></label></fieldset><div className="sale-summary"><span>Cantidad: <b>{quantity||"—"}</b></span><span>Total: <b>{money(price*quantityNumber)}</b></span>{type==="sale"&&<strong>Ganancia: {money((price-p.cost)*quantityNumber)}</strong>}</div>{type==="reserve"&&<><h3 className="delivery-form-title">Datos de la entrega</h3><DeliveryModeFields mode={mode} setMode={setMode} date={datePlus(1)}/><div className="form-grid"><label className="wide">Nombre del cliente<input required name="client" placeholder="Nombre completo"/></label><label className="wide">Teléfono<input required name="phone" type="tel" placeholder="7000-0000"/></label><label className="wide">Lugar de entrega<input required name="address" placeholder="Dirección o punto de referencia"/></label></div></>}<button className="submit">Confirmar {type==="sale"?"venta":"reserva y entrega"}</button></form>
}

function DeliveryModeFields({mode,setMode,date}:{mode:DeliveryMode;setMode:(m:DeliveryMode)=>void;date:string}){return <><fieldset className="delivery-mode-choice"><legend>Modalidad de envío</legend><label className={mode==="Propio"?"chosen":""}><input type="radio" name="mode" value="Propio" checked={mode==="Propio"} onChange={()=>setMode("Propio")}/><span><b>Lo entregamos nosotras</b><small>Entrega directa al cliente</small></span></label><label className={mode==="Empresa"?"chosen":""}><input type="radio" name="mode" value="Empresa" checked={mode==="Empresa"} onChange={()=>setMode("Empresa")}/><span><b>Envío con empresa</b><small>Requiere seguimiento de remuneración</small></span></label></fieldset><div className="form-grid shipping-fields">{mode==="Propio"?<><label>Fecha de entrega<input required name="date" type="date" defaultValue={date}/></label><label>Hora de entrega<input required name="time" type="time" defaultValue="10:00"/></label></>:<><label className="wide">Empresa de envío<input required name="company" placeholder="Nombre de la empresa"/></label><label className="wide">Día de entrega a la empresa<input required name="handoffDate" type="date" defaultValue={date}/></label><label>Día que recoge el cliente<input required name="pickupDate" type="date" defaultValue={datePlus(2)}/></label><label>Hora de recolección<input required name="pickupTime" type="time" defaultValue="10:00"/></label><label className="wide">Total de la remuneración<input required name="remuneration" type="number" min="0" step="0.01" placeholder="0.00"/></label></>}</div></>}
