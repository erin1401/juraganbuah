/* assets/js/app.js — full upgraded for marketplace flow */
(() => {
  'use strict';

  /* ---------------- constants & helpers ---------------- */
  const LS_CART = 'jb_cart_v2';
  const LS_ORDERS = 'jb_orders_v2';
  let WA_SELLER = '6281234567890'; // <<< GANTI NOMOR PENJUAL (tanpa +)
  const currency = v => 'Rp' + Number(v).toLocaleString('id-ID');
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  /* ---------------- sample products (extendable) ---------------- */
  const PRODUCTS = [
    { id:'p1', title:'Mangga Harum', price:25000, img:'assets/img/mangga.jpg', desc:'Mangga harum manis — segar langsung panen.', rating:4.8, sold:1200, promo:10, category:'buah-buah' },
    { id:'p2', title:'Apel Merah', price:30000, img:'assets/img/apel.jpg', desc:'Apel segar, renyah & manis.', rating:4.6, sold:800, promo:0, category:'buah-buah' },
    { id:'p3', title:'Jeruk Manis', price:18000, img:'assets/img/jeruk.jpg', desc:'Jeruk manis bergizi tinggi.', rating:4.7, sold:600, promo:5, category:'buah-buah' },
    { id:'p4', title:'Pisang Ambon', price:20000, img:'assets/img/pisang.jpg', desc:'Pisang matang sempurna.', rating:4.5, sold:430, promo:0, category:'buah-buah' },
    { id:'pkg1', title:'Paket Hemat 2kg', price:50000, img:'assets/img/package1.jpg', desc:'Paket mix 2kg — cocok keluarga kecil', rating:4.9, sold:300, promo:12, category:'paket' }
  ];

  const PRODUCT_STOCK = { p1:12,p2:4,p3:0,p4:22,pkg1:10 };

  /* ---------------- storage helpers ---------------- */
  function loadCart(){ try{ return JSON.parse(localStorage.getItem(LS_CART)) || []; }catch(e){ return []; } }
  function saveCart(c){ localStorage.setItem(LS_CART, JSON.stringify(c)); updateCartUI(); }
  function loadOrders(){ try{ return JSON.parse(localStorage.getItem(LS_ORDERS)) || []; }catch(e){ return []; } }
  function saveOrders(o){ localStorage.setItem(LS_ORDERS, JSON.stringify(o)); }

  /* ---------------- cart ops ---------------- */
  function addToCart(item){
    const cart = loadCart();
    const found = cart.find(i => i.id === item.id);
    if(found) found.qty += item.qty || 1;
    else cart.push({...item, qty: item.qty || 1});
    saveCart(cart);
  }
  function removeFromCart(id){ const c = loadCart().filter(i=>i.id!==id); saveCart(c); }
  function clearCart(){ localStorage.removeItem(LS_CART); updateCartUI(); }
  function updateCartQty(id, qty){ const cart = loadCart(); const it = cart.find(x=>x.id===id); if(!it) return; it.qty = Math.max(1, Number(qty)||1); saveCart(cart); }

  /* ---------------- cart sidebar UI ---------------- */
  const cartSidebarSelector = '#cartSidebar';
  function buildCartSidebar(){
    const el = document.querySelector(cartSidebarSelector);
    if(!el) return;
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h3 style="margin:0">Keranjang</h3>
        <button id="closeCartBtn" class="btn ghost">Tutup</button>
      </div>
      <div id="cartItems" class="cart-items" style="margin-top:12px"></div>
      <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center">
        <strong>Total:</strong><strong id="cartTotal">Rp0</strong>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px">
        <a href="checkout.html" class="btn primary w-100">Checkout</a>
        <button id="clearCartBtn" class="btn danger">Kosongkan</button>
      </div>
    `;
    $('#closeCartBtn').onclick = ()=> document.querySelector(cartSidebarSelector).classList.remove('open');
    $('#clearCartBtn').onclick = ()=> { if(confirm('Kosongkan keranjang?')) clearCart(); };
    updateCartUI();
  }

  function updateCartUI(){
    const el = document.querySelector(cartSidebarSelector); if(!el) return;
    const cart = loadCart();
    const total = cart.reduce((s,i)=> s + i.price * i.qty, 0);
    const count = cart.reduce((s,i)=> s + i.qty, 0);
    el.querySelector('#cartTotal').textContent = currency(total);
    const itemsWrap = el.querySelector('#cartItems');
    itemsWrap.innerHTML = cart.length ? cart.map(i => `
      <div class="cart-item" data-id="${i.id}" style="display:flex;gap:8px;align-items:center;padding:8px;border-radius:8px;border:1px solid rgba(0,0,0,0.04);margin-bottom:8px">
        <img src="${i.img}" onerror="this.src='https://picsum.photos/seed/${i.id}/120/80'" style="width:64px;height:48px;object-fit:cover;border-radius:6px"/>
        <div style="flex:1">
          <strong>${i.title}</strong>
          <div style="font-size:.85rem;color:var(--muted)">${currency(i.price)} x ${i.qty}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <button class="btn small" data-act="inc">+</button>
          <button class="btn small" data-act="dec">-</button>
          <button class="btn small danger" data-act="del">x</button>
        </div>
      </div>
    `).join('') : '<p>Keranjang kosong</p>';

    // counts
    $$('#cartCountTop, #cartCount').forEach(n=>{ if(n) n.textContent = count; });

    // attach events
    $$('.cart-item').forEach(itemEl=>{
      const id = itemEl.dataset.id;
      itemEl.querySelector('[data-act="inc"]').onclick = ()=> { const cart = loadCart(); const it = cart.find(x=>x.id===id); if(it){ it.qty++; saveCart(cart); } };
      itemEl.querySelector('[data-act="dec"]').onclick = ()=> { const cart = loadCart(); const it = cart.find(x=>x.id===id); if(it){ it.qty = Math.max(1, it.qty-1); saveCart(cart); } };
      itemEl.querySelector('[data-act="del"]').onclick = ()=> removeFromCart(id);
    });
  }

  /* ------------ rendering products (marketplace style) ----------- */
  function stockBadge(id){
    const s = PRODUCT_STOCK[id] || 0;
    if(s === 0) return `<span class="stock red">Habis</span>`;
    if(s <= 5) return `<span class="stock yellow">Menipis (${s})</span>`;
    return `<span class="stock green">Tersedia (${s})</span>`;
  }

  function renderProductList(target='productList', opts={}){
    const wrap = document.getElementById(target);
    if(!wrap) return;
    const q = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const cat = (document.getElementById('catFilter')?.value || 'all');
    const sort = (document.getElementById('sortBy')?.value || 'popular');

    let list = PRODUCTS.slice();
    if(q) list = list.filter(p => p.title.toLowerCase().includes(q) || (p.desc||'').toLowerCase().includes(q));
    if(cat && cat !== 'all') list = list.filter(p=>p.category === cat);

    if(sort === 'price-asc') list.sort((a,b)=>a.price-b.price);
    else if(sort === 'price-desc') list.sort((a,b)=>b.price-a.price);
    else list.sort((a,b)=> (b.sold||0) - (a.sold||0));

    wrap.innerHTML = list.map(p => `
      <div class="product-card fade-in" data-id="${p.id}">
        <img src="${p.img}" alt="${p.title}">
        <div class="info">
          <div class="product-title">${p.title}</div>
          <div class="product-meta">
            <div class="product-rating">⭐ ${p.rating} • Terjual ${p.sold}</div>
            <div>${p.promo ? `<span class="promo-tag">-${p.promo}%</span>` : ''}</div>
          </div>
          <div class="product-price">${currency(p.price)}</div>
          <div style="margin-top:8px;display:flex;gap:8px">
            <button class="btn" data-add="${p.id}">Tambah Keranjang</button>
            <button class="btn primary" data-buy="${p.id}">Beli Sekarang</button>
          </div>
          <div style="margin-top:8px">${stockBadge(p.id)}</div>
        </div>
      </div>
    `).join('');

    // attach events
    wrap.querySelectorAll('[data-add]').forEach(b=>{
      b.onclick = (e) => {
        const id = e.currentTarget.dataset.add;
        const p = PRODUCTS.find(x=>x.id===id);
        addToCart({...p, qty:1});
        document.querySelector(cartSidebarSelector).classList.add('open');
      };
    });
    wrap.querySelectorAll('[data-buy]').forEach(b=>{
      b.onclick = (e) => {
        e.stopPropagation();
        const id = e.currentTarget.dataset.buy;
        const p = PRODUCTS.find(x=>x.id===id);
        clearCart();
        addToCart({...p, qty:1});
        window.location.href = 'checkout.html';
      };
    });

    // card click => open detail modal
    wrap.querySelectorAll('.product-card').forEach(card=>{
      card.onclick = () => {
        const id = card.dataset.id;
        openProductModal(id);
      };
    });

    initTilt();
  }

  /* ---------------- product modal ---------------- */
  function openProductModal(id){
    const p = PRODUCTS.find(x=>x.id===id);
    const modal = $('#prodModal');
    if(!modal) return;
    $('#m_img').src = p.img;
    $('#m_title').textContent = p.title;
    $('#m_price').textContent = currency(p.price);
    $('#m_desc').textContent = p.desc || '';
    $('#m_add').onclick = ()=> { addToCart({...p,qty:1}); modal.classList.remove('open'); document.querySelector(cartSidebarSelector).classList.add('open'); };
    $('#m_buy').onclick = ()=> { clearCart(); addToCart({...p,qty:1}); location.href = 'checkout.html'; };
    $('#m_close').onclick = ()=> modal.classList.remove('open');
    modal.classList.add('open');
  }

  /* -------------- slider & tilt handlers ---------------- */
  function initSlider(){
    const slides = $$('.slide');
    if(!slides.length) return;
    let idx = 0;
    slides.forEach((s,i)=> s.classList.toggle('active', i===0));
    setInterval(()=> { slides[idx].classList.remove('active'); idx=(idx+1)%slides.length; slides[idx].classList.add('active'); }, 6000);
  }
  function initTilt(){
    $$('.product-card, .tilt').forEach(el=>{
      el.style.transformStyle = 'preserve-3d';
      el.onmousemove = (ev) => {
        const r = el.getBoundingClientRect();
        const px = (ev.clientX - r.left) / r.width;
        const py = (ev.clientY - r.top) / r.height;
        const rx = (py - 0.5) * 8;
        const ry = (0.5 - px) * 12;
        el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.02)`;
      };
      el.onmouseleave = ()=> { el.style.transform = ''; };
    });
  }

  /* -------------- Checkout logic (shipping & payment) -------------- */
  function shippingCost(method){
    if(method === 'hemat') return 6000;
    if(method === 'same') return 20000;
    return 10000;
  }

  function checkoutRender(){
    const container = $('#checkoutItems');
    if(!container) return;
    const cart = loadCart();
    container.innerHTML = cart.length ? cart.map(i=>`
      <div style="display:flex;gap:10px;align-items:center;padding:8px;border-bottom:1px dashed rgba(0,0,0,0.04)">
        <img src="${i.img}" style="width:84px;height:56px;object-fit:cover;border-radius:8px"/>
        <div style="flex:1">
          <div><strong>${i.title}</strong></div>
          <div style="font-size:.9rem;color:var(--muted)">${currency(i.price)} x ${i.qty}</div>
        </div>
        <div style="font-weight:700">${currency(i.price * i.qty)}</div>
      </div>
    `).join('') : '<p>Keranjang kosong</p>';

    // summary
    const subtotal = cart.reduce((s,i)=> s + i.price*i.qty, 0);
    $('#subTotal') && ($('#subTotal').textContent = currency(subtotal));
    const shipMethod = $('#shippingMethod')?.value || 'reg';
    const ship = shippingCost(shipMethod);
    $('#shipCost') && ($('#shipCost').textContent = currency(ship));
    $('#discount') && ($('#discount').textContent = currency(0));
    $('#grandTotal') && ($('#grandTotal').textContent = currency(subtotal + ship));
  }

  // Place order -> save order & redirect to payment page if needed
  function placeOrderFlow(){
    const name = $('#c_name')?.value?.trim();
    const phone = $('#c_phone')?.value?.trim();
    const address = $('#c_address')?.value?.trim();
    if(!name || !phone || !address) return alert('Lengkapi detail pengiriman.');
    const cart = loadCart();
    if(!cart.length) return alert('Keranjang kosong.');
    const shipMethod = $('#shippingMethod').value;
    const payMethod = $('#payMethod').value;
    const subtotal = cart.reduce((s,i)=> s + i.price*i.qty, 0);
    const ship = shippingCost(shipMethod);
    const total = subtotal + ship;
    const orderId = 'ORD' + Date.now();
    const order = {
      id: orderId, name, phone, address, items: cart, subtotal, shipMethod, shipCost: ship, paymentMethod: payMethod, total,
      status: 'pending_payment', created: new Date().toISOString()
    };
    const orders = loadOrders(); orders.unshift(order); saveOrders(orders);

    // If payment method requires redirect to payment page:
    if(payMethod === 'transfer' || payMethod === 'qris'){
      // open payment.html with params
      const url = `payment.html?method=${payMethod}&total=${total}&order=${orderId}`;
      window.location.href = url;
    } else if(payMethod === 'cod'){
      // COD — mark as confirmed and redirect to tracking
      order.status = 'cod_confirmed';
      saveOrders(loadOrders().map(o => o.id === order.id ? order : o));
      clearCart();
      alert('Pesanan diterima. Pembayaran akan dilakukan saat pengiriman (COD). Order ID: ' + orderId);
      window.location.href = 'tracking.html?order=' + orderId;
    }
  }

  /* ---------------- invoice generation (html2canvas + jsPDF) ---------------- */
  async function generateInvoice(orderId){
    const orders = loadOrders();
    const order = orders.find(o => o.id === orderId);
    if(!order) return alert('Order tidak ditemukan');
    const invoiceEl = document.createElement('div');
    invoiceEl.style.padding = '20px'; invoiceEl.style.background = '#fff'; invoiceEl.style.color = '#111';
    invoiceEl.innerHTML = `
      <h2>Invoice — Juragan Buah</h2>
      <div>Tanggal: ${new Date(order.created).toLocaleString()}</div>
      <div>Order ID: ${order.id}</div>
      <table style="width:100%;margin-top:12px;border-collapse:collapse">
        <thead><tr><th align="left">Item</th><th align="right">Qty</th><th align="right">Subtotal</th></tr></thead>
        <tbody>
          ${order.items.map(i => `<tr><td>${i.title}</td><td align="right">${i.qty}</td><td align="right">${currency(i.price*i.qty)}</td></tr>`).join('')}
        </tbody>
      </table>
      <h3 style="text-align:right">Total: ${currency(order.total)}</h3>
      <div id="qrInv"></div>
    `;
    document.body.appendChild(invoiceEl);
    new QRCode(invoiceEl.querySelector('#qrInv'), { text: `${order.id}`, width:128, height:128 });
    const canvas = await html2canvas(invoiceEl, { scale:2 });
    const img = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p','mm','a4');
    const pageW = pdf.internal.pageSize.getWidth();
    const imgProps = pdf.getImageProperties(img);
    const pdfH = (imgProps.height * pageW) / imgProps.width;
    pdf.addImage(img, 'PNG', 0, 0, pageW, pdfH);
    pdf.save(`invoice_${order.id}.pdf`);
    document.body.removeChild(invoiceEl);
  }

  /* ---------------- tracking utilities ---------------- */
  function autoUpdateStatus(order){
    const created = new Date(order.created).getTime();
    const age = Date.now() - created;
    // simple flow: <2h = Dikemas, <24h = Dikirim, >=24h = Selesai
    if(order.status === 'cod_confirmed') return 'Dalam Proses (COD)';
    if(age < 2*60*60*1000) return 'Dikemas';
    if(age < 24*60*60*1000) return 'Dikirim';
    return 'Selesai';
  }

  function renderTracking(orderId){
    const orders = loadOrders();
    const found = orders.find(o => o.id === orderId);
    if(!found) return alert('Order tidak ditemukan');
    const content = $('#trackContent');
    if(!content) return;
    found.status = autoUpdateStatus(found);
    content.innerHTML = `
      <p><strong>Order ID:</strong> ${found.id}</p>
      <p><strong>Nama:</strong> ${found.name}</p>
      <p><strong>No WA:</strong> ${found.phone}</p>
      <p><strong>Alamat:</strong> ${found.address}</p>
      <p><strong>Status:</strong> ${found.status}</p>
      <div class="progress"><div class="bar" style="width:${found.status === 'Dikemas'?33:found.status === 'Dikirim'?66:100}%"></div></div>
      <p><strong>Total:</strong> ${currency(found.total)}</p>
      <p><strong>Items:</strong></p>
      <ul>${found.items.map(i=>`<li>${i.title} x${i.qty} — ${currency(i.price*i.qty)}</li>`).join('')}</ul>
    `;
    $('#waTrack') && ($('#waTrack').onclick = ()=> {
      const wa = found.phone.replace(/\D/g,'');
      const txt = encodeURIComponent(`Halo, saya ingin menanyakan status order ${found.id}`);
      window.open(`https://api.whatsapp.com/send?phone=${wa}&text=${txt}`, '_blank');
    });
  }

  /* ---------------- init checkout page events ---------------- */
  function initCheckoutPage(){
    if(!$('#checkoutItems')) return;
    // initial render
    checkoutRender();
    // update summary when shipping/pay changes
    $('#shippingMethod') && ($('#shippingMethod').onchange = checkoutRender);
    $('#payMethod') && ($('#payMethod').onchange = ()=>{ /* could display extra inputs */ });
    $('#placeOrder') && ($('#placeOrder').onclick = placeOrderFlow);
  }

  /* ---------------- init tracking page events ---------------- */
  function initTrackingPage(){
    if(!$('#trackBtn')) return;
    $('#trackBtn').onclick = () => {
      const id = $('#trackId').value.trim();
      if(!id) return alert('Masukkan Order ID');
      $('#trackResult').classList.remove('hidden');
      renderTracking(id);
    };
    $('#listOrders') && ($('#listOrders').onclick = ()=> {
      const orders = loadOrders();
      if(!orders.length) return alert('Tidak ada order lokal');
      alert('Orders lokal:\\n\\n' + orders.map(o => `${o.id} — ${o.name} — ${o.status} — ${new Date(o.created).toLocaleString()}`).join('\\n'));
    });
    // if query param order present, auto show
    const qp = new URLSearchParams(location.search);
    const ord = qp.get('order');
    if(ord) {
      $('#trackResult') && $('#trackResult').classList.remove('hidden');
      renderTracking(ord);
    }
  }

  /* ------------- invoice & payment utilities in other pages --------------- */
  function initPaymentPage(){
    // payment.html has its own inline logic for showing QR/rek, we just expose generateInvoice if needed
    // handled by page script
  }

  /* ------------- misc: gallery preview, mini gallery -------------- */
  function renderMiniGallery(){
    const el = $('#miniGallery');
    if(!el) return;
    const imgs = ['assets/img/gallery1.jpg','assets/img/gallery2.jpg','assets/img/gallery3.jpg'];
    el.innerHTML = imgs.map(s=>`<img src="${s}" loading="lazy">`).join('');
    el.querySelectorAll('img').forEach(img => img.onclick = ()=> openLightbox(img.src));
  }

  /* ------------- lightbox ------------ */
  function openLightbox(src){
    const lb = $('#lightbox'); const img = $('#lightboxImg');
    if(!lb || !img) return;
    img.src = src; lb.classList.remove('hidden');
  }

  /* ------------- startup  ------------- */
  document.addEventListener('DOMContentLoaded', ()=> {
    buildCartSidebar();
    // product listing page
    if($('#productList')) {
      renderProductList('productList');
      // wire filters
      $('#searchInput') && ($('#searchInput').oninput = ()=> renderProductList('productList'));
      $('#catFilter') && ($('#catFilter').onchange = ()=> renderProductList('productList'));
      $('#sortBy') && ($('#sortBy').onchange = ()=> renderProductList('productList'));
    }
    // projects / products pages (alternate id)
    if($('#productsFull')) renderProductList('productsFull');

    // checkout page
    initCheckoutPage();

    // tracking
    initTrackingPage();

    // attach cart open button(s)
    $$('#cartBtn, #cartBtnTop').forEach(b=> { if(b) b.onclick = ()=> document.querySelector(cartSidebarSelector).classList.add('open'); });

    // other UI inits
    initSlider();
    initTilt();
    renderMiniGallery();
    updateCartUI();

    // wire generate invoice via query param? (if page wants)
    // wire year placeholders
    $$('#year,#yearProjects,#yearPricing,#yearCheckout,#yearTracking').forEach(e => { if(e) e.textContent = new Date().getFullYear(); });
  });

  // expose some functions globally for inline HTML usage (limited)
  window.addToCart = addToCart;
  window.generateInvoice = generateInvoice;
  window.openProductModal = openProductModal;
  window.renderProductList = renderProductList;
  window.shippingCost = shippingCost;
})();

/* ---------------------------
   1. SIMULASI ONGKIR BERBASIS KOTA
----------------------------*/

function calcDistanceCity(address){
  address = address.toLowerCase();

  if(address.includes("bandung") || address.includes("bekasi") || address.includes("bogor"))
      return 8000;

  if(address.includes("semarang") || address.includes("surabaya"))
      return 15000;

  if(address.includes("papua") || address.includes("ntt") || address.includes("maluku"))
      return 25000;

  return 12000; // default reguler
}

/* ---------------------------
   2. SIMPAN BUKTI TRANSFER
----------------------------*/

window.savePaymentProof = function(file){
  const reader = new FileReader();
  reader.onload = function(e){
    localStorage.setItem("PAY_PROOF", e.target.result);
  }
  reader.readAsDataURL(file);
}

/* ========== SLIDER ========= */
/* ==================== SLIDER FIX ==================== */

let slideIndex = 0;
let slides, dots;

function initSlider(){
  slides = document.querySelectorAll('.slide');
  const dotsContainer = document.getElementById('dots');

  // Buat titik
  dotsContainer.innerHTML = "";
  slides.forEach((_, i)=>{
     const dot = document.createElement('div');
     dot.onclick = ()=>goToSlide(i);
     dotsContainer.appendChild(dot);
  });

  dots = document.querySelectorAll('#dots div');
  showSlide(0);
}

function showSlide(n){
  slides.forEach(s=>s.classList.remove('active'));
  dots.forEach(d=>d.classList.remove('active'));

  slides[n].classList.add('active');
  dots[n].classList.add('active');
}

function nextSlide(){
  slideIndex = (slideIndex + 1) % slides.length;
  showSlide(slideIndex);
}

function prevSlide(){
  slideIndex = (slideIndex - 1 + slides.length) % slides.length;
  showSlide(slideIndex);
}

function goToSlide(i){
  slideIndex = i;
  showSlide(slideIndex);
}

// Auto-play
setInterval(()=> nextSlide(), 4000);

// Jalankan slider setelah halaman siap
window.addEventListener('load', initSlider);

/* QUICK ORDER */
function quickOrder(){
  const p = document.getElementById("quickProduct").value;
  const q = document.getElementById("quickQty").value;

  const wa =
    `https://wa.me/6281234567890?text=Halo,%20saya%20ingin%20pesan%20${p}%20(${q}kg)`;

  window.open(wa, "_blank");
}
/* PARALLAX yang tidak merusak slider */
window.addEventListener("scroll", () => {
  const y = window.scrollY;
  document.querySelectorAll(".slide").forEach(slide=>{
    slide.style.transform = `translateY(${y * 0.08}px)`; 
  });
});

let slideIndex = 0;
let slides = document.querySelectorAll(".slide");
let dots;

function initSlider(){
    const dotsContainer = document.getElementById("dots");
    dotsContainer.innerHTML = "";

    slides.forEach((s, i) => {
        const d = document.createElement("div");
        d.onclick = () => goToSlide(i);
        dotsContainer.appendChild(d);
    });

    dots = document.querySelectorAll(".dots div");

    showSlide(0);
}

function showSlide(n){
    slides.forEach(s => s.classList.remove("active"));
    dots.forEach(d => d.classList.remove("active"));

    slides[n].classList.add("active");
    dots[n].classList.add("active");
}

function nextSlide(){
    slideIndex = (slideIndex + 1) % slides.length;
    showSlide(slideIndex);
}

function prevSlide(){
    slideIndex = (slideIndex - 1 + slides.length) % slides.length;
    showSlide(slideIndex);
}

function goToSlide(index){
    slideIndex = index;
    showSlide(index);
}

setInterval(nextSlide, 4500);

window.addEventListener("load", initSlider);

/* Scroll Reveal */
const revealElements = document.querySelectorAll(".cat-item, .glass-qo, .hero-text-left");

function reveal() {
    revealElements.forEach(el => {
        const top = el.getBoundingClientRect().top;
        if (top < window.innerHeight - 70) {
            el.style.opacity = "1";
            el.style.transform = "translateY(0)";
        }
    });
}

window.addEventListener("scroll", reveal);
reveal();
