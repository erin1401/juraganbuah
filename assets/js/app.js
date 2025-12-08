/* app.js — fitur lengkap:
   - cart (localStorage) add/remove/update
   - checkout → WhatsApp auto-send + simpan order lokal
   - invoice premium (html2canvas + jsPDF + QR)
   - tracking local + WA button
   - gallery preview via GitHub API + lightbox
   - slider + 3D tilt handlers
*/

(() => {
  // Utilities
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const currency = (v) => {
    return 'Rp' + Number(v).toLocaleString('id-ID');
  };

  // Seed products (you can expand or fetch from API)
  const PRODUCTS = [
    { id: 'p1', title: 'Mangga Harum', price: 25000, img: 'assets/img/mangga.jpg' },
    { id: 'p2', title: 'Apel Merah', price: 30000, img: 'assets/img/apel.jpg' },
    { id: 'p3', title: 'Jeruk Manis', price: 18000, img: 'assets/img/jeruk.jpg' },
    { id: 'p4', title: 'Pisang Ambon', price: 20000, img: 'assets/img/pisang.jpg' }
  ];

  // LocalStorage helpers
  const LS_CART = 'jb_cart_v4';
  const LS_ORDERS = 'jb_orders_v4';

  function loadCart() {
    try { return JSON.parse(localStorage.getItem(LS_CART)) || []; } catch(e){ return []; }
  }
  function saveCart(cart) { localStorage.setItem(LS_CART, JSON.stringify(cart)); updateCartUI(); }
  function loadOrders() { try { return JSON.parse(localStorage.getItem(LS_ORDERS)) || []; } catch(e){ return []; } }
  function saveOrders(orders){ localStorage.setItem(LS_ORDERS, JSON.stringify(orders)); }

  // Cart operations
  function addToCart(item){
    const cart = loadCart();
    const found = cart.find(i => i.id === item.id);
    if(found){ found.qty += item.qty; }
    else cart.push(item);
    saveCart(cart);
  }
  function removeFromCart(id){
    let cart = loadCart().filter(i => i.id !== id);
    saveCart(cart);
  }
  function updateCartItem(id, qty){
    const cart = loadCart();
    const it = cart.find(i => i.id === id);
    if(!it) return;
    it.qty = Math.max(1, qty);
    saveCart(cart);
  }
  function clearCart(){ localStorage.removeItem(LS_CART); updateCartUI(); }

  // UI: cart
  const cartBtn = $('#cartBtn');
  const cartSidebar = $('#cartSidebar');
  const closeCart = $('#closeCart');
  const cartItemsEl = $('#cartItems');
  const cartCountEl = $('#cartCount');
  const cartTotalEl = $('#cartTotal');
  const clearCartBtn = $('#clearCart');

  function updateCartUI(){
    const cart = loadCart();
    const count = cart.reduce((s,i)=>s+i.qty,0);
    const total = cart.reduce((s,i)=>s+i.qty*i.price,0);
    cartCountEl.textContent = count;
    $('#cartCount') && $('#cartCount').textContent = count;
    $('#cartCount2') && $('#cartCount2').textContent = count;
    cartTotalEl.textContent = currency(total);

    cartItemsEl.innerHTML = cart.length ? cart.map(i => `
      <div class="cart-item" data-id="${i.id}">
        <img src="${i.img || 'https://picsum.photos/seed/'+i.id+'/120/80'}" alt="${i.title}">
        <div style="flex:1">
          <strong>${i.title}</strong>
          <div style="font-size:.9rem;color:#666">${currency(i.price)} x ${i.qty}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:.4rem">
          <button class="btn small" data-action="inc">+</button>
          <button class="btn small" data-action="dec">-</button>
          <button class="btn small danger" data-action="del">x</button>
        </div>
      </div>
    `).join('') : '<p>Keranjang kosong</p>';

    // attach events
    $$('.cart-item').forEach(el=>{
      const id = el.dataset.id;
      el.querySelector('[data-action="inc"]').onclick = ()=>{ 
        const cart = loadCart(); const item = cart.find(x=>x.id===id); item.qty++; saveCart(cart); 
      };
      el.querySelector('[data-action="dec"]').onclick = ()=>{
        const cart = loadCart(); const item = cart.find(x=>x.id===id); item.qty = Math.max(1, item.qty-1); saveCart(cart);
      };
      el.querySelector('[data-action="del"]').onclick = ()=> removeFromCart(id);
    });
  }

  // Cart button open
  cartBtn && (cartBtn.onclick = ()=> { cartSidebar.classList.add('open'); });
  closeCart && (closeCart.onclick = ()=> { cartSidebar.classList.remove('open'); });
  clearCartBtn && (clearCartBtn.onclick = ()=> { if(confirm('Kosongkan keranjang?')) clearCart(); });

  // Load products into pages
  function renderProductsGrid(containerId, withButtons = true){
    const el = document.getElementById(containerId);
    if(!el) return;
    el.innerHTML = PRODUCTS.map(p => `
      <div class="product-card tilt" data-id="${p.id}" data-tilt>
        <img src="${p.img}" onerror="this.src='https://picsum.photos/seed/${p.id}/600/400'">
        <h4>${p.title}</h4>
        <p class="price">${currency(p.price)}</p>
        <div class="product-actions">
          ${withButtons ? `<button class="btn" data-add="${p.id}">Tambah</button>` : ''}
          <button class="btn ghost" data-view="${p.id}">Preview</button>
        </div>
      </div>
    `).join('');

    // attach add buttons
    el.querySelectorAll('[data-add]').forEach(btn=>{
      btn.onclick = (e) => {
        const id = e.currentTarget.dataset.add;
        const p = PRODUCTS.find(x=>x.id===id);
        addToCart({ id:p.id, title:p.title, price:p.price, qty:1, img:p.img });
        alert(`${p.title} ditambahkan ke keranjang`);
      };
    });

    // attach preview to open lightbox
    el.querySelectorAll('[data-view]').forEach(btn=>{
      btn.onclick = (e) => {
        const id = e.currentTarget.dataset.view;
        const p = PRODUCTS.find(x=>x.id===id);
        openLightbox(p.img);
      };
    });

    initTilt();
  }

  // quick order form handlers
  const quickOrder = $('#quickOrder');
  if(quickOrder){
    quickOrder.onsubmit = (ev) => {
      ev.preventDefault();
      const name = $('#name').value.trim();
      const phone = $('#phone').value.trim();
      const product = $('#productSelect').value;
      const qty = parseInt($('#qty').value || '1', 10);
      const note = $('#note').value.trim();
      const p = PRODUCTS.find(x=>x.title.includes(product)) || { id: 'quick', title: product, price: 30000, img: 'assets/img/default-prod.jpg' };
      addToCart({ id: p.id, title: p.title + ' ('+product+')', price: p.price, qty, img: p.img });
      // optional: store customer info in session storage for quick checkout
      sessionStorage.setItem('jb_customer', JSON.stringify({ name, phone }));
      alert('Item ditambahkan ke keranjang. Lanjut ke checkout ketika siap.');
    };
    $('#waQuick').onclick = () => {
      const name = $('#name').value.trim();
      const phone = $('#phone').value.trim();
      const product = $('#productSelect').value;
      const qty = $('#qty').value;
      const note = $('#note').value.trim();
      if(!phone) return alert('Masukkan nomor WA tujuan Anda.');
      const waNumber = phone.replace(/\D/g,'');
      const text = encodeURIComponent(`Halo, saya ${name}\nPesanan: ${product}\nQty: ${qty}\nCatatan: ${note}`);
      const url = `https://api.whatsapp.com/send?phone=${waNumber}&text=${text}`;
      window.open(url, '_blank');
    };
  }

  // Slider
  function initSlider(){
    const slides = $$('.slide');
    if(!slides.length) return;
    let idx = 0;
    slides.forEach((s,i)=> s.classList.toggle('active', i===0));
    const show = (n)=> {
      slides.forEach((s,i)=> s.classList.toggle('active', i===n));
    };
    $('#nextSlide') && ($('#nextSlide').onclick = ()=> { idx = (idx+1)%slides.length; show(idx); });
    $('#prevSlide') && ($('#prevSlide').onclick = ()=> { idx = (idx-1+slides.length)%slides.length; show(idx); });

    // auto slide
    setInterval(()=>{ idx = (idx+1)%slides.length; show(idx); }, 6000);
    // parallax on mouse
    const hero = $('.hero');
    if(hero){
      hero.onmousemove = (e) => {
        const w = hero.clientWidth; const h = hero.clientHeight;
        const x = (e.clientX/w - 0.5) * 20;
        const y = (e.clientY/h - 0.5) * 10;
        hero.style.transform = `translate3d(${x}px,${y}px,0)`;
      };
    }
  }

  // 3D tilt init
  function initTilt(){
    const tiltEls = $$('.tilt');
    tiltEls.forEach(el=>{
      el.onmousemove = (ev) => {
        const rect = el.getBoundingClientRect();
        const x = (ev.clientX - rect.left) / rect.width;
        const y = (ev.clientY - rect.top) / rect.height;
        const rx = (y - 0.5) * 10;
        const ry = (0.5 - x) * 10;
        el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.02)`;
        el.style.boxShadow = `${-ry*2}px ${rx*2}px 30px rgba(0,0,0,0.12)`;
      };
      el.onmouseleave = ()=> { el.style.transform=''; el.style.boxShadow=''; };
    });
  }

  // Lightbox
  const lightbox = $('#lightbox'), lbImg = $('#lightboxImg'), lbClose = $('#lightboxClose');
  function openLightbox(src){ lbImg.src = src; lightbox.classList.remove('hidden'); }
  function closeLightbox(){ lightbox.classList.add('hidden'); lbImg.src=''; }
  lbClose && (lbClose.onclick = closeLightbox);
  lightbox && (lightbox.onclick = (e) => { if(e.target === lightbox) closeLightbox(); });

  // mini gallery preview on index: fetch a few random images (simulate GitHub preview)
  function renderMiniGallery(){
    const el = $('#miniGallery');
    if(!el) return;
    const imgs = [
      'assets/img/gallery1.jpg','assets/img/gallery2.jpg','assets/img/gallery3.jpg',
      'assets/img/gallery4.jpg','assets/img/gallery5.jpg','assets/img/gallery6.jpg'
    ];
    el.innerHTML = imgs.map(src => `<img src="${src}" onerror="this.src='https://picsum.photos/seed/${Math.random()}/300/200'" data-src="${src}">`).join('');
    el.querySelectorAll('img').forEach(img => img.onclick = ()=> openLightbox(img.src));
  }

  // Checkout page handlers
  function initCheckout(){
    const checkoutItems = $('#checkoutItems');
    function renderCheckoutItems(){
      const cart = loadCart();
      checkoutItems.innerHTML = cart.length ? cart.map(i=>`
        <div class="cart-item">
          <img src="${i.img}" onerror="this.src='https://picsum.photos/seed/${i.id}/120/80'"/>
          <div style="flex:1">
            <strong>${i.title}</strong>
            <div>${currency(i.price)} x ${i.qty}</div>
          </div>
        </div>
      `).join('') : '<p>Keranjang kosong — tambahkan produk terlebih dahulu.</p>';
      $('#invoiceContent') && ($('#invoiceContent').innerHTML = checkoutItems.innerHTML);
    }
    renderCheckoutItems();

    const checkoutForm = $('#checkoutForm');
    checkoutForm && (checkoutForm.onsubmit = (ev) => {
      ev.preventDefault();
      const name = $('#c_name').value.trim();
      const phone = $('#c_phone').value.trim();
      const address = $('#c_address').value.trim();
      const note = $('#c_note').value.trim();
      const cart = loadCart();
      if(!cart.length) return alert('Keranjang kosong.');
      const orderId = 'ORD' + Date.now();
      const total = cart.reduce((s,i)=> s + i.price*i.qty, 0);
      const order = { id: orderId, name, phone, address, note, items: cart, total, status: 'received', created: new Date().toISOString() };
      // save locally
      const orders = loadOrders();
      orders.unshift(order);
      saveOrders(orders);
      // WA auto-send:
      const waTo = '6281234567890'; // <-- Ganti nomer penjual tujuan WA di sini (format internasional tanpa +)
      const text = encodeURIComponent(
        `Order Baru (${orderId})\nNama: ${name}\nNoWA: ${phone}\nAlamat: ${address}\n\nItems:\n` + cart.map(i=>`${i.title} x${i.qty} - ${currency(i.price*i.qty)}`).join('\n') + `\n\nTotal: ${currency(total)}\nCatatan: ${note}`
      );
      const waUrl = `https://api.whatsapp.com/send?phone=${waTo}&text=${text}`;
      // clear cart after sending
      if(confirm('Kirim pesanan via WhatsApp sekarang? (Halaman akan membuka WhatsApp)')) {
        window.open(waUrl, '_blank');
        clearCart();
        alert('Pesanan tersimpan secara lokal dengan ID: ' + orderId);
        // redirect to tracking page
        window.location.href = 'tracking.html';
      } else {
        // still save order
        alert('Pesanan disimpan secara lokal dengan ID: ' + orderId);
      }
    });

    // save local order button
    $('#saveLocal') && ($('#saveLocal').onclick = ()=>{
      const name = $('#c_name').value.trim();
      const phone = $('#c_phone').value.trim();
      const address = $('#c_address').value.trim();
      const note = $('#c_note').value.trim();
      const cart = loadCart(); if(!cart.length) return alert('Keranjang kosong');
      const orderId = 'ORD' + Date.now();
      const total = cart.reduce((s,i)=> s + i.price*i.qty, 0);
      const order = { id: orderId, name, phone, address, note, items: cart, total, status: 'saved', created: new Date().toISOString() };
      const orders = loadOrders(); orders.unshift(order); saveOrders(orders);
      alert('Order disimpan lokal dengan ID: '+orderId);
    });

    // Invoice generation (html2canvas + jsPDF + QR)
    $('#generateInvoice') && ($('#generateInvoice').onclick = async ()=>{
      const cart = loadCart();
      if(!cart.length) return alert('Keranjang kosong');
      const invoiceEl = document.createElement('div');
      invoiceEl.style.padding = '20px';
      invoiceEl.style.background = '#fff';
      invoiceEl.style.color = '#111';
      invoiceEl.innerHTML = `
        <h2>Invoice — Jual Buah Segar</h2>
        <div><strong>Tanggal:</strong> ${new Date().toLocaleString()}</div>
        <div style="margin-top:10px">
          <table style="width:100%;border-collapse:collapse">
            <thead><tr><th align="left">Item</th><th align="right">Qty</th><th align="right">Total</th></tr></thead>
            <tbody>
              ${cart.map(i=>`<tr><td>${i.title}</td><td align="right">${i.qty}</td><td align="right">${currency(i.price*i.qty)}</td></tr>`).join('')}
            </tbody>
          </table>
          <h3 style="text-align:right">Total: ${currency(cart.reduce((s,i)=>s+i.price*i.qty,0))}</h3>
        </div>
        <div id="qrInvoice"></div>
      `;
      document.body.appendChild(invoiceEl);
      // generate QR
      const qrDiv = invoiceEl.querySelector('#qrInvoice');
      new QRCode(qrDiv, { text: 'Invoice('+Date.now()+')', width:128, height:128 });
      // render canvas
      const canvas = await html2canvas(invoiceEl, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      // create PDF
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p','mm','a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const pdfHeight = (imgProps.height * pageWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pdfHeight);
      pdf.save(`invoice_${Date.now()}.pdf`);
      document.body.removeChild(invoiceEl);
    });
  }

  // Tracking page
  function initTracking(){
    $('#trackBtn') && ($('#trackBtn').onclick = () => {
      const id = $('#trackId').value.trim();
      const result = $('#trackResult');
      const content = $('#trackContent');
      if(!id) return alert('Masukkan Order ID');
      const orders = loadOrders();
      const found = orders.find(o => o.id === id);
      if(!found) { alert('Order tidak ditemukan'); return; }
      result.classList.remove('hidden');
      content.innerHTML = `
        <p><strong>Order ID:</strong> ${found.id}</p>
        <p><strong>Nama:</strong> ${found.name}</p>
        <p><strong>NoWA:</strong> ${found.phone}</p>
        <p><strong>Alamat:</strong> ${found.address}</p>
        <p><strong>Status:</strong> ${found.status}</p>
        <p><strong>Items:</strong></p>
        <ul>${found.items.map(i=>`<li>${i.title} x${i.qty} — ${currency(i.price*i.qty)}</li>`).join('')}</ul>
        <p><strong>Total:</strong> ${currency(found.total)}</p>
      `;
      $('#waTrack') && ($('#waTrack').onclick = ()=> {
        const waTo = found.phone.replace(/\D/g,'');
        const text = encodeURIComponent(`Halo, saya ingin menanyakan status order ${found.id}`);
        window.open(`https://api.whatsapp.com/send?phone=${waTo}&text=${text}`, '_blank');
      });
    });

    $('#listOrders') && ($('#listOrders').onclick = ()=>{
      const orders = loadOrders();
      if(!orders.length) return alert('Tidak ada order tersimpan lokal');
      const s = orders.map(o=>`${o.id} — ${o.name} — ${o.status} — ${new Date(o.created).toLocaleString()}`).join('\n');
      alert('Orders lokal:\n\n' + s);
    });
  }

  // Gallery via GitHub API (preview.html will handle full)
  // Here we show a few images if available (from assets or fallback)
  function initGalleryPreview(){
    renderMiniGallery();
  }

  // initialization on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    // common in many pages
    document.querySelectorAll('#year,#yearP,#yearPr,#yearCh,#yearTr').forEach(el=>{
      if(el) el.textContent = new Date().getFullYear();
    });

    initSlider();
    renderProductsGrid('productsGrid', true);
    renderProductsGrid('productsFull', true);
    initGalleryPreview();
    updateCartUI();
    initCheckout();
    initTracking();

    // open cart buttons on other pages
    const cartBtns = document.querySelectorAll('#cartBtn,#cartBtn2');
    cartBtns.forEach(b => { b.onclick = ()=> { cartSidebar.classList.add('open'); } });

    // attach product add in pricing page
    document.querySelectorAll('[data-add]').forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        const id = btn.dataset.add;
        const price = btn.dataset.price ? parseInt(btn.dataset.price,10) : 0;
        const title = btn.dataset.title || id;
        if(price) addToCart({ id: 'pkg-'+id, title, price, qty:1, img: 'assets/img/package.jpg' });
        else {
          // find product id
          const p = PRODUCTS.find(x=>x.id===id);
          if(p) addToCart({ id:p.id, title:p.title, price:p.price, qty:1, img:p.img });
        }
        updateCartUI();
      });
    });

    // basic product preview open: click on product image shows lightbox
    $$('.product-card img').forEach(img => img.onclick = ()=> openLightbox(img.src));
  });

})();
