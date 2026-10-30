// Kaybolan Nazilli – giriş sayfası, kullanım kılavuzu, hakkında, ziyaretçi fotoğrafı paylaşma
(function () {
  'use strict';
  const KN = window.KN, D = KN.D, YAPI = KN.YAPI, esc = KN.esc, depo = KN.depo;
  const $ = s => document.querySelector(s);
  const SUNUCU = () => ((depo.al('sohbet', {}) || {}).sunucu || 'https://nazli-nine.cyamaner.workers.dev').replace(/\/+$/, '');

  // ---------- sayfa (tam ekran katman) açıp kapatma ----------
  function sayfaAc(id) { document.querySelectorAll('.sayfa').forEach(s => { s.hidden = s.id !== id; }); const s = $('#' + id); s.scrollTop = 0; const b = s.querySelector('h1, h2'); if (b) { b.tabIndex = -1; b.focus({ preventScroll: true }); } }
  function sayfaKapat() { document.querySelectorAll('.sayfa').forEach(s => { s.hidden = true; }); }
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-sayfa]');
    if (a) { e.preventDefault(); a.dataset.sayfa === 'kapat' ? sayfaKapat() : sayfaAc(a.dataset.sayfa); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { const acik = [...document.querySelectorAll('.sayfa')].find(s => !s.hidden); if (acik && acik.id !== 'sayfa-giris') sayfaKapat(); } });

  // ---------- giriş sayfası ----------
  const yikilmis = D.yapilar.filter(y => /^(Yıkıl|Risk|Büyük ölçüde kayıp)/.test(y.durum)).length;
  const ciftler = D.yapilar.filter(y => y.eski).length;
  $('#girisSayilar').innerHTML = [
    [D.yapilar.length, 'tarihi yapı'], [ciftler, 'dün / bugün fotoğrafı'], [yikilmis, 'yıkılmış ya da risk altında']
  ].map(([n, t]) => `<div><b>${n}</b><span>${t}</span></div>`).join('');
  $('#basla').onclick = () => { sayfaKapat(); document.querySelector('.alt button[data-s="harita"]').click(); };
  // QR etiketiyle (#yapi=...) gelindiyse giriş sayfasını atla
  if (!/yapi=KN-/.test(location.hash)) sayfaAc('sayfa-giris'); else sayfaKapat();
  document.getElementById('surumHakkinda').textContent = 'Veri sürümü: ' + D.surum;

  // ---------- fotoğraf paylaşma ----------
  const secim = $('#payYapi');
  secim.innerHTML = '<option value="">Hangi yapı? (bilmiyorsan boş bırak)</option>' +
    D.yapilar.map(y => `<option value="${esc(y.id)}">${esc(y.ad)}</option>`).join('');
  let hazirResim = null;
  function kucult(dosya) { // en fazla 1600 px JPEG; tuval üzerinden yeniden çizildiği için EXIF ve konum bilgisi silinir
    return new Promise((ok, hata) => {
      const img = new Image(), u = URL.createObjectURL(dosya);
      img.onload = () => {
        const o = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * o); c.height = Math.round(img.naturalHeight * o);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
        c.toBlob(b => b ? ok(b) : hata(new Error('dönüştürülemedi')), 'image/jpeg', 0.82);
      };
      img.onerror = () => { URL.revokeObjectURL(u); hata(new Error('okunamadı')); };
      img.src = u;
    });
  }
  $('#payDosya').onchange = async e => {
    const f = e.target.files[0]; hazirResim = null; $('#payOnizleme').innerHTML = '';
    if (!f) return;
    try {
      hazirResim = await kucult(f);
      $('#payOnizleme').innerHTML = `<img src="${URL.createObjectURL(hazirResim)}" alt="Seçilen fotoğraf">`;
    } catch (err) { KN.bildir('Bu fotoğraf açılamadı; JPEG ya da PNG deneyin'); }
  };
  $('#payForm').onsubmit = async e => {
    e.preventDefault();
    const durumYaz = t => { $('#payDurum').textContent = t; };
    if (!hazirResim) { durumYaz('Önce bir fotoğraf seçin.'); return; }
    if (!$('#payIzin').checked) { durumYaz('Paylaşım iznini onaylamanız gerekiyor.'); return; }
    const fd = new FormData();
    fd.append('resim', hazirResim, 'foto.jpg');
    fd.append('yapi', secim.value); fd.append('yil', $('#payYil').value); fd.append('aciklama', $('#payAciklama').value);
    fd.append('ad', $('#payAd').value); fd.append('sahip', $('#paySahip').value); fd.append('izin', 'evet');
    $('#payGonder').disabled = true; durumYaz('Gönderiliyor…');
    try {
      const r = await fetch(SUNUCU() + '/fotolar/gonder', { method: 'POST', body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.hata || 'Gönderilemedi');
      $('#payForm').reset(); hazirResim = null; $('#payOnizleme').innerHTML = '';
      durumYaz('Teşekkürler! Fotoğrafınız yönetici onayından sonra uygulamada görünecek.');
      KN.bildir('Fotoğraf gönderildi 📤');
    } catch (err) {
      durumYaz((err.message || 'Gönderilemedi') + '. İnternet bağlantınızı kontrol edip tekrar deneyin.');
    } finally { $('#payGonder').disabled = false; }
  };
  function paylasAc(yapiId) { secim.value = yapiId || ''; $('#payDurum').textContent = ''; sayfaAc('sayfa-paylas'); }

  // ---------- onaylı ziyaretçi fotoğrafları ----------
  let onayli = null;
  async function onaylilar() {
    if (onayli) return onayli;
    try { const r = await fetch(SUNUCU() + '/fotolar/onayli'); onayli = r.ok ? await r.json() : []; } catch (e) { onayli = []; }
    return onayli;
  }
  async function kartaEkle(id, kutu) {
    const l = (await onaylilar()).filter(f => f.yapi === id);
    if (!kutu.isConnected) return;
    kutu.innerHTML = (l.length ? `<h3>Ziyaretçilerden</h3><div class="ciftler">${l.map(f => `<figure>
        <img src="${esc(SUNUCU())}/fotolar/resim/${esc(f.id)}" alt="${esc(f.aciklama || 'Ziyaretçi fotoğrafı')}" loading="lazy"
          data-alt="${esc((f.aciklama || '') + ' · ' + (f.yil || 'tarihsiz') + ' · Paylaşan: ' + f.ad)}">
        <figcaption>${esc(f.yil || 'Tarihsiz')} · ${esc(f.ad)}</figcaption></figure>`).join('')}</div>` : '')
      + `<button class="hap" data-paylas="${esc(id)}">📤 Elinde bu yapının eski bir fotoğrafı mı var? Paylaş</button>`;
    kutu.querySelector('[data-paylas]').onclick = () => paylasAc(id);
  }
  window.KN_ZIYARETCI = { kartaEkle, paylasAc };
})();
