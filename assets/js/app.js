/* assets/js/app.js - final (produk, cart, checkout, invoice, tracking, gallery preview, slider, tilt) */
(() => {
  'use strict';
  const LS_CART = 'jb_cart_v1';
  const LS_ORDERS = 'jb_orders_v1';
  let WA_SELLER = '6282213629469'; // <-- GANTI NOMOR PENJUAL DI SINI
  const currency = v => 'Rp' + Number(v).toLocaleString('id-ID');
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  const PRODUCTS = [
    { id: 'p1', title: 'Mangga Harum', price: 25000, img: 'assets/img/mangga.jpg', desc: 'Mangga harum manis, siap kirim.' }, rating: 4.9,
    sold: 1200, promo: 10,
    { id: 'p2', title: 'Apel Merah', price: 30000, img: 'assets/img/apel.jpg', desc: 'Apel segar, renyah.' }, rating: 4.9,
    sold: 1200, promo: 10,
    { id: 'p3', title: 'Jeruk Manis', price: 18000, img: 'assets/img/jeruk.jpg', desc: 'Jeruk manis penuh vitamin C.' }, rating: 4.9,
    sold: 1200, promo: 10,
    { id: 'p4', title: 'Pisang Ambon', price: 20000, img: 'assets/img/pisang.jpg', desc: 'Pisang matang sempurna.' }, rating: 4.9,
    sold: 1200, promo: 10,
  ];

  const PRODUCT_STOCK = { p1: 12, p2: 4, p3: 0, p4: 22 };

  function loadCart(){ try{ return JSON.parse(localStorage.getItem(LS_CART)) || []; }catch(e){ return []; } }
  function saveCart(c){ localStorage.setItem(LS_CART, JSON.stringify(c)); updateCartUI(); }
  function loadOrders(){ try{ return JSON.parse(localStorage.getItem(LS_ORDERS)) || []; }catch(e){ return []; } }
  function saveOrders(o){ localStorage.setItem(LS_ORDERS, JSON.stringify(o)); }

  function addToCart(item){
    const cart = loadCart(); const found = cart.find(i=>i.id===item.id);
    if(found){ found.qty += item.qty || 1; } else cart.push({...item, qty: item.qty || 1});
    saveCart(cart);
  }
  function removeFromCart(id){ const cart = loadCart().filter(i=>i.id!==id); saveCart(cart); }
  function clearCart(){ localStorage.removeItem(LS_CART); updateCartUI(); }
  function updateCartQty(id, qty){ const cart = loadCart(); const it = cart.find(x=>x.id===id); if(!it) return; it.qty = Math.max(1, Number(qty)||1); saveCart(cart); }

  const cartSidebarSelector = '#cartSidebar';
  function buildCartSidebar(){
    const el = document.querySelector(cartSidebarSelector); if(!el) return;
    el.innerHTML = `
      <div class="cart-header"><h3>Keranjang</h3><button id="closeCartBtn" class="btn ghost">Tutup</button></div>
      <div id="cartItems" class="cart-items"></div>
      <div class="cart-footer">
        <div class="cart-summary"><strong>Total:</strong> <span id="cartTotal">Rp0</span></div>
        <div class="cart-actions">
          <a href="checkout.html" class="btn primary">Checkout</a>
          <button id="clearCartBtn" class="btn danger">Kosongkan</button>
        </div>
      </div>
    `;
    $('#closeCartBtn').onclick = ()=> document.querySelector(cartSidebarSelector).classList.remove('open');
    $('#clearCartBtn').onclick = ()=> { if(confirm('Kosongkan keranjang?')) clearCart(); };
    updateCartUI();
  }

  function updateCartUI(){
    const el = document.querySelector(cartSidebarSelector); if(!el) return;
    const cart = loadCart(); const total = cart.reduce((s,i)=> s + i.price * i.qty, 0);
    const count = cart.reduce((s,i)=> s + i.qty, 0);
    el.querySelector('#cartTotal').textContent = currency(total);
    const itemsWrap = el.querySelector('#cartItems');
    itemsWrap.innerHTML = cart.length ? cart.map(i=>`
      <div class="cart-item" data-id="${i.id}">
        <img src="${i.img}" onerror="this.src='https://picsum.photos/seed/${i.id}/120/80'"/>
        <div style="flex:1"><strong>${i.title}</strong><div style="font-size:.9rem;color:#666">${currency(i.price)} x ${i.qty}</div></div>
        <div style="display:flex;flex-direction:column;gap:.35rem">
          <button class="btn small" data-act="inc">+</button>
          <button class="btn small" data-act="dec">-</button>
          <button class="btn small danger" data-act="del">x</button>
        </div>
      </div>
    `).join('') : '<p style="padding:12px;">Keranjang kosong</p>';
    $$('#cartCountTop, #cartCount, #cartCount2, #cartCountPrice').forEach(n=>{ if(n) n.textContent = count; });

    $$('.cart-item').forEach(itemEl => {
      const id = itemEl.dataset.id;
      itemEl.querySelector('[data-act="inc"]').onclick = ()=> { const cart = loadCart(); const it = cart.find(x=>x.id===id); if(it){ it.qty++; saveCart(cart); } };
      itemEl.querySelector('[data-act="dec"]').onclick = ()=> { const cart = loadCart(); const it = cart.find(x=>x.id===id); if(it){ it.qty = Math.max(1, it.qty-1); saveCart(cart); } };
      itemEl.querySelector('[data-act="del"]').onclick = ()=> removeFromCart(id);
    });
  }

  function stockBadge(id){ let s = PRODUCT_STOCK[id] || 0; if(s===0) return `<span class="stock red">Habis</span>`; if(s<=5) return `<span class="stock yellow">Menipis (${s})</span>`; return `<span class="stock green">Tersedia (${s})</span>`; }

  // Modal detail
  const modal = $('#prodModal'), mt = $('#m_title'), mi = $('#m_img'), mp = $('#m_price'), md = $('#m_desc');
  if($('#m_close')) $('#m_close').onclick = ()=> modal.classList.remove('open');

  window.openDetail = (id)=>{
    const p = PRODUCTS.find(x=>x.id===id);
    if(!p) return;
    mt.textContent = p.title; mi.src = p.img; mp.textContent = currency(p.price); md.textContent = p.desc || '';
    modal.classList.add('open');
  };

  // products renderer
  function renderProductsGridShopee() {
  const wrap = document.getElementById("productList");
  wrap.innerHTML = PRODUCTS.map(p => `
    <div class="product-card" onclick="openDetail('${p.id}')">
      <img class="product-img" src="${p.img}">
      <div class="product-info">
        
        <div class="product-title">${p.title}</div>
        
        <div class="product-rating">⭐ ${p.rating} | Terjual ${p.sold}</div>

        ${p.promo ? `<div class="promo-tag">-${p.promo}%</div>` : ""}

        <div class="product-price">${currency(p.price)}</div>

        <div class="btn-buy" onclick="event.stopPropagation(); buyNow('${p.id}')">
          Beli Sekarang
        </div>

      </div>
    </div>
  `).join('');
}

  window.buyNow = (id)=>{ const p = PRODUCTS.find(x=>x.id===id); if(!p) return; clearCart(); addToCart({...p,qty:1}); location.href='checkout.html'; };
  window.goCheckout = (id)=>{ const p = PRODUCTS.find(x=>x.id===id); if(!p) return; addToCart({...p,qty:1}); location.href='checkout.html'; };
  window.waPay = (id)=>{ const p = PRODUCTS.find(x=>x.id===id); if(!p) return; const text = encodeURIComponent(`Halo, saya ingin membeli:\n${p.title}\nQty:1\nTotal: ${currency(p.price)}`); window.open(`https://api.whatsapp.com/send?phone=${WA_SELLER}&text=${text}`, '_blank'); };

  // slider
  function initSlider(){ const slides = $$('.slide'); if(!slides.length) return; let idx=0; slides.forEach((s,i)=>s.classList.toggle('active',i===0)); setInterval(()=>{ slides[idx].classList.remove('active'); idx=(idx+1)%slides.length; slides[idx].classList.add('active'); },6000); }

  // tilt
  function initTilt(){ $$('.tilt').forEach(el=>{ el.onmousemove = e=>{ const r=el.getBoundingClientRect(); const px=(e.clientX-r.left)/r.width; const py=(e.clientY-r.top)/r.height; const rx=(py-0.5)*10; const ry=(0.5-px)*12; el.style.transform=`perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.02)`; }; el.onmouseleave=()=>{ el.style.transform=''; }; }); }

  // lightbox (if exists)
  function openLightbox(src){ const lb = $('#lightbox'); const img = $('#lightboxImg'); if(!lb||!img) return; img.src = src; lb.classList.remove('hidden'); }
  if($('#lightboxClose')) $('#lightboxClose').onclick = ()=> { $('#lightbox').classList.add('hidden'); $('#lightboxImg').src=''; };
  if($('#lightbox')) $('#lightbox').onclick = e => { if(e.target === $('#lightbox')) { $('#lightbox').classList.add('hidden'); $('#lightboxImg').src=''; } };

  // checkout page logic
  function initCheckoutPage(){
    const container = $('#checkoutItems'); if(!container) return;
    function render(){ const cart = loadCart(); container.innerHTML = cart.length ? cart.map(i=>`<div class="cart-item"><img src="${i.img}" onerror="this.src='https://picsum.photos/seed/${i.id}/120/80'"/><div style="flex:1"><strong>${i.title}</strong><div>${currency(i.price)} x ${i.qty}</div></div></div>`).join('') : '<p>Keranjang kosong — tambahkan produk terlebih dahulu.</p>'; const invoiceCont = $('#invoiceContent'); if(invoiceCont) invoiceCont.innerHTML = container.innerHTML; }
    render();
    const form = $('#checkoutForm'); if(form){ form.onsubmit = ev => { ev.preventDefault(); const name = $('#c_name').value.trim(); const phone = $('#c_phone').value.trim(); const address = $('#c_address').value.trim(); const note = $('#c_note').value.trim(); const cart = loadCart(); if(!cart.length) { alert('Keranjang kosong'); return; } const orderId = 'ORD'+Date.now(); const total = cart.reduce((s,i)=> s + i.price*i.qty, 0); const order = { id: orderId, name, phone, address, note, items: cart, total, status: 'received', created: new Date().toISOString() }; const orders = loadOrders(); orders.unshift(order); saveOrders(orders); const itemsText = cart.map(i=>`${i.title} x${i.qty} — ${currency(i.price*i.qty)}`).join('\\n'); const text = encodeURIComponent(`Order Baru (${orderId})\\nNama: ${name}\\nNoWA: ${phone}\\nAlamat: ${address}\\n\\nItems:\\n${itemsText}\\n\\nTotal: ${currency(total)}\\nCatatan: ${note}`); if(confirm('Kirim pesanan via WhatsApp sekarang? (membuka tab baru)')){ window.open(`https://api.whatsapp.com/send?phone=${WA_SELLER}&text=${text}`,'_blank'); clearCart(); alert('Pesanan tersimpan lokal sebagai '+orderId); location.href='tracking.html'; } else { alert('Pesanan disimpan lokal sebagai '+orderId); } }; }
    if($('#saveLocalOrder')) $('#saveLocalOrder').onclick = ()=>{ const name = $('#c_name').value.trim(); const phone = $('#c_phone').value.trim(); const address = $('#c_address').value.trim(); const note = $('#c_note').value.trim(); const cart = loadCart(); if(!cart.length) return alert('Keranjang kosong'); const orderId = 'ORD'+Date.now(); const total = cart.reduce((s,i)=> s + i.price*i.qty, 0); const order = { id: orderId, name, phone, address, note, items: cart, total, status: 'saved', created: new Date().toISOString() }; const orders = loadOrders(); orders.unshift(order); saveOrders(orders); alert('Order disimpan lokal dengan ID: '+orderId); };
    if($('#genInvoice')) $('#genInvoice').onclick = async ()=>{ const cart = loadCart(); if(!cart.length) return alert('Keranjang kosong'); const invoiceDom = document.createElement('div'); invoiceDom.style.padding='20px'; invoiceDom.style.background='#fff'; invoiceDom.style.color='#111'; invoiceDom.style.width='800px'; invoiceDom.innerHTML = `<h2>Invoice — Juragan Buah</h2><div><strong>Tanggal:</strong> ${new Date().toLocaleString()}</div><table style="width:100%;margin-top:12px;border-collapse:collapse"><thead><tr><th align="left">Item</th><th align="right">Qty</th><th align="right">Subtotal</th></tr></thead><tbody>${cart.map(i=>`<tr><td>${i.title}</td><td align="right">${i.qty}</td><td align="right">${currency(i.price*i.qty)}</td></tr>`).join('')}</tbody></table><h3 style="text-align:right">Total: ${currency(cart.reduce((s,i)=> s + i.price*i.qty,0))}</h3><div id="qrInv" style="margin-top:8px"></div>`; document.body.appendChild(invoiceDom); new QRCode(invoiceDom.querySelector('#qrInv'), { text: `INV-${Date.now()}`, width:128, height:128 }); const canvas = await html2canvas(invoiceDom, { scale:2 }); const imgData = canvas.toDataURL('image/png'); const { jsPDF } = window.jspdf; const pdf = new jsPDF('p','mm','a4'); const pageW = pdf.internal.pageSize.getWidth(); const imgProps = pdf.getImageProperties(imgData); const pdfH = (imgProps.height * pageW) / imgProps.width; pdf.addImage(imgData, 'PNG', 0, 0, pageW, pdfH); pdf.save(`invoice_${Date.now()}.pdf`); document.body.removeChild(invoiceDom); };
  }

  function initTrackingPage(){
    if(!$('#trackBtn')) return;
    $('#trackBtn').onclick = ()=>{ const id = $('#trackId').value.trim(); if(!id) return alert('Masukkan Order ID'); const orders = loadOrders(); const found = orders.find(o=>o.id===id); if(!found) return alert('Order tidak ditemukan'); $('#trackResult').classList.remove('hidden'); $('#trackContent').innerHTML = `<p><strong>Order ID:</strong> ${found.id}</p><p><strong>Nama:</strong> ${found.name}</p><p><strong>NoWA:</strong> ${found.phone}</p><p><strong>Alamat:</strong> ${found.address}</p><p><strong>Status:</strong> ${found.status}</p><p><strong>Items:</strong></p><ul>${found.items.map(i=>`<li>${i.title} x${i.qty} — ${currency(i.price*i.qty)}</li>`).join('')}</ul><p><strong>Total:</strong> ${currency(found.total)}</p>`; $('#waContact').onclick = ()=>{ const wa = found.phone.replace(/\D/g,''); const txt = encodeURIComponent(`Halo, saya ingin menanyakan status order ${found.id}`); window.open(`https://api.whatsapp.com/send?phone=${wa}&text=${txt}`,'_blank'); }; };
    if($('#listOrders')) $('#listOrders').onclick = ()=> { const orders = loadOrders(); if(!orders.length) return alert('Tidak ada order lokal'); alert('Orders lokal:\\n\\n' + orders.map(o=>`${o.id} — ${o.name} — ${o.status} — ${new Date(o.created).toLocaleString()}`).join('\\n')); };
  }

  // Init DOM ready
  document.addEventListener('DOMContentLoaded', ()=> {
    buildCartSidebar();
    renderProductsGrid('productsFull');
    initSlider();
    initTilt();
    updateCartUI();
    initCheckoutPage();
    initTrackingPage();
    $$('#cartBtn, #cartBtnTop, #cartBtn2, #cartBtnPrice').forEach(b=>{ if(b) b.onclick = ()=> document.querySelector(cartSidebarSelector).classList.add('open'); });
    $$('#year,#yearProjects,#yearPricing,#yearCheckout,#yearTracking').forEach(el=>{ if(el) el.textContent = new Date().getFullYear(); });
  });
})();
