/* assets/js/app.js
   Versi lengkap untuk Juragan Buah:
   - Cart (localStorage): add / remove / update / clear
   - Checkout: WA auto-send + simpan order lokal
   - Invoice: html2canvas + jsPDF + QR
   - Tracking: cari order lokal + WA tombol
   - Gallery preview: preview.html menggunakan GitHub API (lihat file preview.html)
   - Slider + 3D tilt handlers
*/

(() => {
  'use strict';

  /* -------------------------
     Helpers & constants
  -------------------------*/
  const LS_CART = 'jb_cart_v1';
  const LS_ORDERS = 'jb_orders_v1';
  const WA_SELLER = '6281234567890'; // <-- GANTI NOMOR PENJUAL (format internasional, tanpa +). Ubah ini.
  const currency = v => 'Rp' + Number(v).toLocaleString('id-ID');

  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  /* -------------------------
     Products (seed) — edit sesuai katalog
  -------------------------*/
  const PRODUCTS = [
    { id: 'p1', title: 'Mangga Harum', price: 25000, img: 'assets/img/mangga.jpg' },
    { id: 'p2', title: 'Apel Merah', price: 30000, img: 'assets/img/apel.jpg' },
    { id: 'p3', title: 'Jeruk Manis', price: 18000, img: 'assets/img/jeruk.jpg' },
    { id: 'p4', title: 'Pisang Ambon', price: 20000, img: 'assets/img/pisang.jpg' }
  ];

  /* -------------------------
     localStorage helpers
  -------------------------*/
  function loadCart(){ try{ return JSON.parse(localStorage.getItem(LS_CART)) || []; }catch(e){ return []; } }
  function saveCart(c){ localStorage.setItem(LS_CART, JSON.stringify(c)); updateCartUI(); }
  function loadOrders(){ try{ return JSON.parse(localStorage.getItem(LS_ORDERS)) || []; }catch(e){ return []; } }
  function saveOrders(o){ localStorage.setItem(LS_ORDERS, JSON.stringify(o)); }

  /* -------------------------
     Cart operations
  -------------------------*/
  function addToCart(item){
    const cart = loadCart();
    const found = cart.find(i => i.id === item.id);
    if(found) found.qty += item.qty || 1;
    else cart.push({ ...item, qty: item.qty || 1 });
    saveCart(cart);
  }
  function removeFromCart(id){
    const cart = loadCart().filter(i => i.id !== id);
    saveCart(cart);
  }
  function updateCartQty(id, qty){
    const cart = loadCart();
    const it = cart.find(i => i.id === id);
    if(!it) return;
    it.qty = Math.max(1, Number(qty) || 1);
    saveCart(cart);
  }
  function clearCart(){ localStorage.removeItem(LS_CART); updateCartUI(); }

  /* -------------------------
     DOM: Cart UI (sidebar)
  -------------------------*/
  const cartSidebarSelector = '#cartSidebar';
  function buildCartSidebar(){
    const el = document.querySelector(cartSidebarSelector);
    if(!el) return;
    el.innerHTML = `
      <div class="cart-header">
        <h3>Keranjang</h3>
        <button id="closeCartBtn" class="btn ghost">Tutup</button>
      </div>
      <div id="cartItems" class="cart-items"></div>
      <div class="cart-footer">
        <div class="cart-summary"><strong>Total:</strong> <span id="cartTotal">Rp0</span></div>
        <div class="cart-actions">
          <a href="checkout.html" class="btn primary">Checkout</a>
          <button id="clearCartBtn" class="btn danger">Kosongkan</button>
        </div>
      </div>
    `;
    // events
    $('#closeCartBtn').onclick = ()=> document.querySelector(cartSidebarSelector).classList.remove('open');
    $('#clearCartBtn').onclick = ()=> { if(confirm('Kosongkan keranjang?')) clearCart(); };
    updateCartUI();
  }

  function updateCartUI(){
    const el = document.querySelector(cartSidebarSelector);
    if(!el) return;
    const cart = loadCart();
    const total = cart.reduce((s,i)=> s + i.price * i.qty, 0);
    const count = cart.reduce((s,i)=> s + i.qty, 0);
    el.querySelector('#cartTotal').textContent = currency(total);

    const itemsWrap = el.querySelector('#cartItems');
    if(!itemsWrap) return;
    itemsWrap.innerHTML = cart.length ? cart.map(i => `
      <div class="cart-item" data-id="${i.id}">
        <img src="${i.img}" onerror="this.src='https://picsum.photos/seed/${i.id}/120/80'"/>
        <div style="flex:1">
          <strong>${i.title}</strong>
          <div style="font-size:.9rem;color:#666">${currency(i.price)} x ${i.qty}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:.35rem">
          <button class="btn small" data-act="inc">+</button>
          <button class="btn small" data-act="dec">-</button>
          <button class="btn small danger" data-act="del">x</button>
        </div>
      </div>
    `).join('') : '<p style="padding:12px;">Keranjang kosong</p>';

    // cart counts top
    $$('#cartCountTop, #cartCountPrice, #cartCount, #cartCount2, #cartCountPrice, #cartCountTop, #cartCountPrice').forEach(n => { if(n) n.textContent = count; });

    // attach item buttons
    $$('.cart-item').forEach(itemEl => {
      const id = itemEl.dataset.id;
      itemEl.querySelector('[data-act="inc"]').onclick = () => {
        const cart = loadCart(); const it = cart.find(x=>x.id===id); if(it){ it.qty++; saveCart(cart); }
      };
      itemEl.querySelector('[data-act="dec"]').onclick = () => {
        const cart = loadCart(); const it = cart.find(x=>x.id===id); if(it){ it.qty = Math.max(1, it.qty-1); saveCart(cart); }
      };
      itemEl.querySelector('[data-act="del"]').onclick = () => removeFromCart(id);
    });
  }

  /* -------------------------
     Render product grids
  -------------------------*/
  function renderProductsGrid(containerId = 'productsGrid', full = false){
    const wrap = document.getElementById(containerId);
    if(!wrap) return;
    const products = PRODUCTS.slice();
    wrap.innerHTML = products.map(p => `
      <div class="product-card tilt" data-id="${p.id}" data-tilt>
        <img src="${p.img}" onerror="this.src='https://picsum.photos/seed/${p.id}/600/400'">
        <h4>${p.title}</h4>
        <p class="price">${currency(p.price)}</p>
        <div class="product-actions">
          <button class="btn" data-add="${p.id}">Tambah</button>
          <button class="btn ghost" data-preview="${p.id}">Preview</button>
        </div>
      </div>
    `).join('');
    // attach events
    wrap.querySelectorAll('[data-add]').forEach(btn=>{
      btn.onclick = (e) => {
        const id = e.currentTarget.dataset.add;
        const p = PRODUCTS.find(x=>x.id===id);
        addToCart({ id: p.id, title: p.title, price: p.price, qty:1, img: p.img });
        alert(`${p.title} ditambahkan ke keranjang`);
      };
    });
    wrap.querySelectorAll('[data-preview]').forEach(btn=>{
      btn.onclick = e => {
        const id = e.currentTarget.dataset.preview;
        const p = PRODUCTS.find(x=>x.id===id);
        openLightbox(p.img);
      };
    });
    initTilt();
  }

  /* -------------------------
     Slider
  -------------------------*/
  function initSlider(){
    const slides = $$('.slide');
    if(!slides.length) return;
    let idx = 0;
    slides.forEach((s,i) => s.classList.toggle('active', i===0));
    window.setInterval(()=> {
      slides[idx].classList.remove('active');
      idx = (idx + 1) % slides.length;
      slides[idx].classList.add('active');
    }, 6000);
  }

  /* -------------------------
     3D tilt
  -------------------------*/
  function initTilt(){
    $$('.tilt').forEach(el => {
      el.style.transformStyle = 'preserve-3d';
      el.onmousemove = (ev) => {
        const r = el.getBoundingClientRect();
        const px = (ev.clientX - r.left) / r.width;
        const py = (ev.clientY - r.top) / r.height;
        const rx = (py - 0.5) * 10;
        const ry = (0.5 - px) * 14;
        el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.02)`;
        el.style.transition = 'transform 0.08s';
      };
      el.onmouseleave = () => { el.style.transform = ''; el.style.transition = 'transform 0.25s ease'; };
    });
  }

  /* -------------------------
     Lightbox
  -------------------------*/
  const lightbox = $('#lightbox');
  const lightboxImg = $('#lightboxImg');
  function openLightbox(src){
    if(!lightbox) return;
    lightboxImg.src = src;
    lightbox.classList.remove('hidden');
  }
  function closeLightbox(){
    if(!lightbox) return;
    lightbox.classList.add('hidden');
    lightboxImg.src = '';
  }
  if($('#lightboxClose')) $('#lightboxClose').onclick = closeLightbox;
  if(lightbox) lightbox.onclick = (e) => { if(e.target === lightbox) closeLightbox(); };

  /* -------------------------
     Mini gallery on index (fallback images)
  -------------------------*/
  function renderMiniGallery(){
    const el = $('#miniGallery');
    if(!el) return;
    const imgs = ['assets/img/gallery1.jpg','assets/img/gallery2.jpg','assets/img/gallery3.jpg','assets/img/gallery4.jpg','assets/img/gallery5.jpg','assets/img/gallery6.jpg'];
    el.innerHTML = imgs.map(s => `<img src="${s}" onerror="this.src='https://picsum.photos/seed/${Math.random()}/300/200'">`).join('');
    el.querySelectorAll('img').forEach(img => img.onclick = () => openLightbox(img.src));
  }

  /* -------------------------
     Checkout page logic: render items, handle form, WA send, save local, invoice
  -------------------------*/
  function initCheckoutPage(){
    const container = $('#checkoutItems');
    if(!container) return;
    function render(){
      const cart = loadCart();
      container.innerHTML = cart.length ? cart.map(i => `
        <div class="cart-item">
          <img src="${i.img}" onerror="this.src='https://picsum.photos/seed/${i.id}/120/80'"/>
          <div style="flex:1">
            <strong>${i.title}</strong>
            <div>${currency(i.price)} x ${i.qty}</div>
          </div>
        </div>
      `).join('') : '<p>Keranjang kosong — tambahkan produk terlebih dahulu.</p>';
      // invoiceContent mirror
      const invoiceCont = $('#invoiceContent');
      if(invoiceCont) invoiceCont.innerHTML = container.innerHTML;
    }
    render();

    const form = $('#checkoutForm');
    if(form){
      form.onsubmit = (ev) => {
        ev.preventDefault();
        const name = $('#c_name').value.trim();
        const phone = $('#c_phone').value.trim();
        const address = $('#c_address').value.trim();
        const note = $('#c_note').value.trim();
        const cart = loadCart();
        if(!cart.length) { alert('Keranjang kosong'); return; }
        const orderId = 'ORD' + Date.now();
        const total = cart.reduce((s,i)=> s + i.price*i.qty, 0);
        const order = { id: orderId, name, phone, address, note, items: cart, total, status: 'received', created: new Date().toISOString() };
        // save local
        const orders = loadOrders();
        orders.unshift(order);
        saveOrders(orders);
        // prepare WA text
        const itemsText = cart.map(i => `${i.title} x${i.qty} — ${currency(i.price*i.qty)}`).join('\n');
        const text = encodeURIComponent(`Order Baru (${orderId})\nNama: ${name}\nNoWA: ${phone}\nAlamat: ${address}\n\nItems:\n${itemsText}\n\nTotal: ${currency(total)}\nCatatan: ${note}`);
        // open WA to seller
        // IMPORTANT: change WA_SELLER variable above to your seller number
        if(confirm('Kirim pesanan via WhatsApp sekarang? (membuka tab baru)')) {
          window.open(`https://api.whatsapp.com/send?phone=${WA_SELLER}&text=${text}`, '_blank');
          clearCart();
          alert('Pesanan tersimpan lokal sebagai ' + orderId);
          window.location.href = 'tracking.html';
        } else {
          alert('Pesanan disimpan lokal sebagai ' + orderId);
        }
      };
    }

    // save local order button
    if($('#saveLocalOrder')) $('#saveLocalOrder').onclick = () => {
      const name = $('#c_name').value.trim();
      const phone = $('#c_phone').value.trim();
      const address = $('#c_address').value.trim();
      const note = $('#c_note').value.trim();
      const cart = loadCart();
      if(!cart.length) return alert('Keranjang kosong');
      const orderId = 'ORD' + Date.now();
      const total = cart.reduce((s,i)=> s + i.price*i.qty, 0);
      const order = { id: orderId, name, phone, address, note, items: cart, total, status: 'saved', created: new Date().toISOString() };
      const orders = loadOrders(); orders.unshift(order); saveOrders(orders);
      alert('Order disimpan lokal dengan ID: ' + orderId);
    };

    // generate invoice (html2canvas + jsPDF + QR)
    if($('#genInvoice')) $('#genInvoice').onclick = async () => {
      const cart = loadCart();
      if(!cart.length) return alert('Keranjang kosong');
      // build invoice DOM
      const invoiceDom = document.createElement('div');
      invoiceDom.style.padding = '20px'; invoiceDom.style.background = '#fff'; invoiceDom.style.color = '#111'; invoiceDom.style.width = '800px';
      invoiceDom.innerHTML = `
        <h2>Invoice — Juragan Buah</h2>
        <div><strong>Tanggal:</strong> ${new Date().toLocaleString()}</div>
        <table style="width:100%;margin-top:12px;border-collapse:collapse">
          <thead><tr><th align="left">Item</th><th align="right">Qty</th><th align="right">Subtotal</th></tr></thead>
          <tbody>
            ${cart.map(i => `<tr><td>${i.title}</td><td align="right">${i.qty}</td><td align="right">${currency(i.price*i.qty)}</td></tr>`).join('')}
          </tbody>
        </table>
        <h3 style="text-align:right">Total: ${currency(cart.reduce((s,i)=> s + i.price*i.qty,0))}</h3>
        <div id="qrInv" style="margin-top:8px"></div>
      `;
      document.body.appendChild(invoiceDom);
      // QR
      new QRCode(invoiceDom.querySelector('#qrInv'), { text: `INV-${Date.now()}`, width:128, height:128 });
      // render canvas
      const canvas = await html2canvas(invoiceDom, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p','mm','a4');
      const pageW = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      const pdfH = (imgProps.height * pageW) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pageW, pdfH);
      pdf.save(`invoice_${Date.now()}.pdf`);
      document.body.removeChild(invoiceDom);
    };
  }

  /* -------------------------
     Tracking page logic
  -------------------------*/
  function initTrackingPage(){
    if(!$('#trackBtn')) return;
    $('#trackBtn').onclick = () => {
      const id = $('#trackId').value.trim();
      if(!id) return alert('Masukkan Order ID');
      const orders = loadOrders();
      const found = orders.find(o => o.id === id);
      if(!found) return alert('Order tidak ditemukan');
      $('#trackResult').classList.remove('hidden');
      $('#trackContent').innerHTML = `
        <p><strong>Order ID:</strong> ${found.id}</p>
        <p><strong>Nama:</strong> ${found.name}</p>
        <p><strong>NoWA:</strong> ${found.phone}</p>
        <p><strong>Alamat:</strong> ${found.address}</p>
        <p><strong>Status:</strong> ${found.status}</p>
        <p><strong>Items:</strong></p>
        <ul>${found.items.map(i=>`<li>${i.title} x${i.qty} — ${currency(i.price*i.qty)}</li>`).join('')}</ul>
        <p><strong>Total:</strong> ${currency(found.total)}</p>
      `;
      $('#waContact').onclick = () => {
        const wa = found.phone.replace(/\D/g,'');
        const txt = encodeURIComponent(`Halo, saya ingin menanyakan status order ${found.id}`);
        window.open(`https://api.whatsapp.com/send?phone=${wa}&text=${txt}`, '_blank');
      };
    };

    $('#listOrders') && ($('#listOrders').onclick = () => {
      const orders = loadOrders();
      if(!orders.length) return alert('Tidak ada order lokal');
      const s = orders.map(o => `${o.id} — ${o.name} — ${o.status} — ${new Date(o.created).toLocaleString()}`).join('\n');
      alert('Orders lokal:\n\n' + s);
    });
  }

  /* -------------------------
     Projects / Pricing page init (attach package buttons)
  -------------------------*/
  function initPricingPage(){
    $$('.pricing-card [data-pkg]').forEach(btn => {
      btn.onclick = (e) => {
        const pkg = JSON.parse(btn.getAttribute('data-pkg'));
        addToCart({ id: pkg.id, title: pkg.title, price: Number(pkg.price), qty:1, img: pkg.img || 'assets/img/package1.jpg' });
        alert(pkg.title + ' ditambahkan ke keranjang');
      };
    });
  }

  /* -------------------------
     GitHub Gallery Preview (preview.html handles direct GitHub API calls)
     Here we keep a mini preview on index
  -------------------------*/
  // renderMiniGallery already defined above

  /* -------------------------
     Init function on DOM ready
  -------------------------*/
  document.addEventListener('DOMContentLoaded', () => {
    // render cart sidebar if present
    buildCartSidebar();

    // render products in multiple places
    renderProductsGrid('productsGrid');
    renderProductsGrid('productsFull');

    // product list on projects page:
    renderProductsGrid('productsFull');

    // pricing page behaviors
    initPricingPage();

    // slider + gallery + tilt
    initSlider();
    initTilt();
    renderMiniGallery();

    // checkout page
    initCheckoutPage();

    // tracking page
    initTrackingPage();

    // attach cart open buttons
    $$('#cartBtn, #cartBtnTop, #cartBtn2, #cartBtnPrice').forEach(btn => {
      if(btn) btn.onclick = () => document.querySelector(cartSidebarSelector).classList.add('open');
    });

    // lightbox close already attached if exists
    if($('#lightboxClose')) $('#lightboxClose').onclick = closeLightbox;

    // wire year fields
    $$('#year,#yearP,#yearPr,#yearCh,#yearTr,#yearProjects,#yearPricing,#yearCheckout,#yearTracking').forEach(el => {
      if(el) el.textContent = new Date().getFullYear();
    });

    // build product cards on pages if missing
    if(document.getElementById('productsGrid')) renderProductsGrid('productsGrid');
    if(document.getElementById('productsFull')) renderProductsGrid('productsFull');

    // ensure cart UI reflects state
    updateCartUI();
  });

})();
/* -------------------------------------------------------------------
   UPGRADE PROJECTS: tombol checkout, beli langsung, stok, modal, WA
-------------------------------------------------------------------*/

const PRODUCT_STOCK = {
  p1: 12,
  p2: 4,
  p3: 0,
  p4: 22
};

function stockBadge(id){
  let st = PRODUCT_STOCK[id] || 0;
  if(st === 0) return `<span class="stock red">Habis</span>`;
  if(st <= 5) return `<span class="stock yellow">Menipis (${st})</span>`;
  return `<span class="stock green">Tersedia (${st})</span>`;
}

// MODAL
const modal = document.getElementById("prodModal");
const m_title = document.getElementById("m_title");
const m_img = document.getElementById("m_img");
const m_price = document.getElementById("m_price");
const m_desc = document.getElementById("m_desc");
document.getElementById("m_close").onclick = ()=> modal.classList.remove("open");

// override renderProductsGrid
function renderProductsGrid(containerId = 'productsFull'){
  const wrap = document.getElementById(containerId);
  if(!wrap) return;
  
  wrap.innerHTML = PRODUCTS.map(p => `
    <div class="product-card tilt">
      <img src="${p.img}" loading="lazy">
      <h4>${p.title}</h4>
      <p class="price">${currency(p.price)}</p>
      ${stockBadge(p.id)}

      <div class="product-buttons">
        <button class="btn" onclick='addToCart(${JSON.stringify(p)})'>Tambah Keranjang</button>

        <button class="btn primary" onclick='buyNow("${p.id}")'>Beli Sekarang</button>

        <button class="btn ghost" onclick='goCheckout("${p.id}")'>Checkout</button>

        <button class="btn danger" onclick='waPay("${p.id}")'>Bayar via WA</button>

        <button class="btn" onclick='openDetail("${p.id}")'>Detail</button>
      </div>
    </div>
  `).join("");

  initTilt();
}

/* -------------------------
   STOCK DATABASE
---------------------------*/
const PRODUCT_STOCK = {
  p1: 12,
  p2: 4,
  p3: 0,
  p4: 22
};

function stockBadge(id){
  let s = PRODUCT_STOCK[id] ?? 0;
  if(s === 0) return `<span class="stock red">Stok Habis</span>`;
  if(s <= 5) return `<span class="stock yellow">Menipis (${s})</span>`;
  return `<span class="stock green">Tersedia (${s})</span>`;
}

/* -------------------------
   MODAL DETAIL PRODUK
---------------------------*/
const modal = document.getElementById("prodModal");
const mt = document.getElementById("m_title");
const mi = document.getElementById("m_img");
const mp = document.getElementById("m_price");
const md = document.getElementById("m_desc");
document.getElementById("m_close").onclick = () => modal.classList.remove("open");

window.openDetail = (id)=>{
  const p = PRODUCTS.find(x=>x.id===id);
  mt.textContent = p.title;
  mi.src = p.img;
  mp.textContent = currency(p.price);
  md.textContent = "Buah premium, baru dipanen hari ini 🍃";
  modal.classList.add("open");
};

/* -------------------------
   RENDER PRODUK BARU
---------------------------*/
function renderProductsGrid(containerId = "productsFull"){
  const wrap = document.getElementById(containerId);
  if(!wrap) return;

  wrap.innerHTML = PRODUCTS.map(p => `
    <div class="product-card tilt">
      <img src="${p.img}" loading="lazy">
      <h4>${p.title}</h4>
      <p class="price">${currency(p.price)}</p>
      ${stockBadge(p.id)}

      <div class="product-buttons">
        <button class="btn" onclick='addToCart(${JSON.stringify(p)})'>Tambah Keranjang</button>
        <button class="btn primary" onclick='buyNow("${p.id}")'>Beli Sekarang</button>
        <button class="btn ghost" onclick='goCheckout("${p.id}")'>Checkout</button>
        <button class="btn danger" onclick='waPay("${p.id}")'>Bayar WA</button>
        <button class="btn" onclick='openDetail("${p.id}")'>Detail</button>
      </div>
    </div>
  `).join("");

  initTilt();
}

/* -------------------------
   BELI SEKARANG
---------------------------*/
window.buyNow = (id)=>{
  const p = PRODUCTS.find(x=>x.id===id);
  clearCart();
  addToCart({ ...p, qty:1 });
  location.href = "checkout.html";
};

/* -------------------------
   GO CHECKOUT
---------------------------*/
window.goCheckout = (id)=>{
  const p = PRODUCTS.find(x=>x.id===id);
  addToCart({ ...p, qty:1 });
  location.href = "checkout.html";
};

/* -------------------------
   WA PAYMENT
---------------------------*/
window.waPay = (id)=>{
  const p = PRODUCTS.find(x=>x.id===id);
  let msg = encodeURIComponent(`Halo, saya ingin membeli ${p.title} (1 pcs).\nHarga: ${currency(p.price)}`);
  window.open(`https://wa.me/628XXXXXX?text=${msg}`,"_blank");
};
