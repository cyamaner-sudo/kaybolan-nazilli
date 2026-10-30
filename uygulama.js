// Kaybolan Nazilli – konum tabanlı gezi uygulaması
(function () {
  'use strict';
  const D = window.KN_VERI;
  const YAPI = {};
  D.yapilar.forEach(y => { YAPI[y.id] = y; });
  const konumlu = D.yapilar.filter(y => y.lat != null);
  const merkezde = konumlu.filter(y => !y.uzak);

  // ---------- küçük yardımcılar ----------
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const depo = {
    al(k, v) { try { const x = localStorage.getItem('kn_' + k); return x == null ? v : JSON.parse(x); } catch (e) { return v; } },
    koy(k, v) { try { localStorage.setItem('kn_' + k, JSON.stringify(v)); } catch (e) { /* özel pencere vb. */ } }
  };
  const R = Math.PI / 180;
  function mesafe(a, b) { // metre
    const dLat = (b[0] - a[0]) * R, dLon = (b[1] - a[1]) * R;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * R) * Math.cos(b[0] * R) * Math.sin(dLon / 2) ** 2;
    return 2 * 6371000 * Math.asin(Math.sqrt(h));
  }
  function yon(a, b) { // kuzeyden saat yönünde derece
    const y = Math.sin((b[1] - a[1]) * R) * Math.cos(b[0] * R);
    const x = Math.cos(a[0] * R) * Math.sin(b[0] * R) - Math.sin(a[0] * R) * Math.cos(b[0] * R) * Math.cos((b[1] - a[1]) * R);
    return (Math.atan2(y, x) / R + 360) % 360;
  }
  function cizgiyeUzaklik(p, yol) { // metre; kısa mesafede düzlem yaklaşımı
    const kx = Math.cos(p[0] * R) * 111320, ky = 110540;
    let en = Infinity;
    for (let i = 1; i < yol.length; i++) {
      const ax = (yol[i - 1][1] - p[1]) * kx, ay = (yol[i - 1][0] - p[0]) * ky;
      const bx = (yol[i][1] - p[1]) * kx, by = (yol[i][0] - p[0]) * ky;
      const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
      const t = l ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l)) : 0;
      en = Math.min(en, Math.hypot(ax + t * dx, ay + t * dy));
    }
    return en;
  }
  const yurumeDk = m => Math.max(1, Math.round(m / 75)); // ~4,5 km/sa
  const metreYaz = m => m < 1000 ? Math.round(m / 10) * 10 + ' m' : (m / 1000).toFixed(1).replace('.', ',') + ' km';
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  function renk(d) {
    if (d.startsWith('Yıkıl') || d.startsWith('Büyük ölçüde kayıp')) return css('--yik');
    if (d.startsWith('Risk')) return css('--risk');
    if (d.startsWith('Ayakta')) return css('--ayk');
    return css('--bil');
  }
  function grup(d) {
    if (d.startsWith('Yıkıl') || d.startsWith('Büyük ölçüde kayıp')) return 'yikilmis';
    if (d.startsWith('Risk')) return 'risk';
    if (d.startsWith('Ayakta')) return 'ayakta';
    return 'diger';
  }
  let bildirimZamani = null;
  function bildir(t) {
    const b = $('#bildirim'); b.textContent = t; b.hidden = false;
    clearTimeout(bildirimZamani); bildirimZamani = setTimeout(() => { b.hidden = true; }, 3200);
  }
  // iOS'ta titreşim yok: kısa bir "bip" ile uyar.
  let sesBaglami = null;
  function uyar(desen) {
    if (!ayar.titresim) return;
    if (navigator.vibrate) { navigator.vibrate(desen || [200, 100, 200]); return; }
    try {
      if (!sesBaglami) return; // dokunuşla oluşturulmadıysa (iOS) sessiz geç
      const o = sesBaglami.createOscillator(), g = sesBaglami.createGain();
      o.frequency.value = 880; g.gain.value = 0.08; o.connect(g); g.connect(sesBaglami.destination);
      o.start(); o.stop(sesBaglami.currentTime + 0.18);
    } catch (e) { /* ses yok */ }
  }

  // ---------- ayarlar ----------
  const ayar = Object.assign({ oto: true, titresim: true, sapma: true, yaricap: 40, hiz: 1, yazi: 100 }, depo.al('ayar', {}));
  const ayarKaydet = () => depo.koy('ayar', ayar);
  function ayarBagla(id, anahtar, cikti, bicim) {
    const el = $('#' + id);
    if (el.type === 'checkbox') { el.checked = ayar[anahtar]; el.onchange = () => { ayar[anahtar] = el.checked; ayarKaydet(); }; }
    else {
      el.value = ayar[anahtar]; if (cikti) $('#' + cikti).textContent = bicim ? bicim(ayar[anahtar]) : ayar[anahtar];
      el.oninput = () => { ayar[anahtar] = +el.value; if (cikti) $('#' + cikti).textContent = bicim ? bicim(ayar[anahtar]) : ayar[anahtar]; ayarKaydet(); uygulaYazi(); };
    }
  }
  function uygulaYazi() { document.documentElement.style.setProperty('--yazi-olcek', ayar.yazi / 100); }
  ayarBagla('otoAnlat', 'oto'); ayarBagla('titresim', 'titresim'); ayarBagla('sapmaUyar', 'sapma');
  ayarBagla('yaricap', 'yaricap', 'yaricapDeger'); ayarBagla('hiz', 'hiz', 'hizDeger', v => Number(v).toFixed(2));
  ayarBagla('yazi', 'yazi', 'yaziDeger'); uygulaYazi();
  $('#sesSecimi').onchange = e => { ayar.ses = e.target.value; ayarKaydet(); sesSec(); seslendir('Merhaba evladım, ben Nazlı Nine.', 'deneme'); };
  $('#surum').textContent = 'Veri sürümü: ' + D.surum;

  // ---------- kalıcı durum: dinlenen, ziyaret, quiz, dedektif ----------
  let dinlenen = new Set(depo.al('dinlenen', []));
  const pasaport = Object.assign({ ziyaret: {}, test: {}, puan: 0 }, depo.al('pasaport', {}));
  const pasaportKaydet = () => depo.koy('pasaport', pasaport);
  let dedektif = depo.al('dedektif', []);
  $('#sifirla').onclick = () => { dinlenen = new Set(); depo.koy('dinlenen', []); bildir('Dinlenen yapılar sıfırlandı'); };
  $('#hepsiniSifirla').onclick = async () => {
    if (!confirm('Pasaport, quiz puanları, dedektif notları ve çektiğiniz fotoğraflar bu telefondan silinsin mi?')) return;
    pasaport.ziyaret = {}; pasaport.test = {}; pasaport.foto = {}; pasaport.puan = 0; pasaportKaydet();
    kazanilan = new Set(); depo.koy('rozet', []);
    dedektif = []; depo.koy('dedektif', dedektif);
    try { await fotoDepo.temizle(); } catch (e) { /* */ }
    pasaportCiz(); bildir('Silindi');
  };

  // ---------- sekmeler ----------
  document.querySelectorAll('.alt button').forEach(b => b.onclick = () => sekmeAc(b.dataset.s));
  function sekmeAc(s) {
    document.querySelectorAll('.alt button').forEach(x => x.classList.toggle('secili', x.dataset.s === s));
    document.querySelectorAll('.sekme').forEach(x => x.classList.toggle('aktif', x.id === 'sekme-' + s));
    if (s === 'harita') setTimeout(() => harita.invalidateSize(), 50);
    if (s === 'liste') listeCiz();
    if (s === 'pasaport') pasaportCiz();
  }
  function durum(t) { $('#durumCubugu').textContent = t; }

  // ---------- harita ----------
  const harita = L.map('harita', { zoomControl: true }).setView(D.merkez, 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap katkıcıları' }).addTo(harita);
  L.control.scale({ imperial: false }).addTo(harita);
  const isaretler = {};
  function isaretCiz() {
    konumlu.forEach(y => {
      if (isaretler[y.id]) harita.removeLayer(isaretler[y.id]);
      const yak = y.dogruluk !== 'OSM', gidildi = !!pasaport.ziyaret[y.id];
      const m = L.circleMarker([y.lat, y.lon], {
        radius: y.eski ? 11 : 8, color: yak ? '#000' : '#fff', weight: gidildi ? 4 : 2, dashArray: yak ? '3 3' : null,
        fillColor: renk(y.durum), fillOpacity: .92
      }).addTo(harita);
      m.bindTooltip((gidildi ? '✓ ' : '') + (y.eski ? '📷 ' : '') + y.ad);
      m.on('click', () => kartAc(y.id, false));
      isaretler[y.id] = m;
    });
  }
  isaretCiz();

  // ---------- sesli anlatım ----------
  const ses = window.speechSynthesis;
  let turkceSes = null;
  // Nazlı Nine bir kadın: telefonda kadın Türkçe sesi varsa onu seç (iPhone: Yelda, Android: Google, Windows/Edge: Emel, Seda)
  const KADIN = /emel|seda|yelda|filiz|google|female|kad[ıi]n/i, ERKEK = /tolga|ahmet|cem\b|male|erkek/i;
  let kadinSesiVar = false;
  function sesSec() {
    if (!ses) return;
    const tr = ses.getVoices().filter(x => /^tr(-|_|$)/i.test(x.lang));
    const secili = tr.find(x => x.name === ayar.ses);
    turkceSes = secili || tr.find(x => KADIN.test(x.name) && !/\bmale\b/i.test(x.name)) || tr.find(x => !ERKEK.test(x.name)) || tr[0] || null;
    kadinSesiVar = !!turkceSes && !ERKEK.test(turkceSes.name);
    const s = document.getElementById('sesSecimi');
    if (s) s.innerHTML = tr.map(v => `<option value="${esc(v.name)}" ${v === turkceSes ? 'selected' : ''}>${esc(v.name)}</option>`).join('') || '<option>Türkçe ses bulunamadı</option>';
  }
  // Nine'nin sesi: hafif yaşlı bir kadın – biraz kalın ve yavaş. Telefonda yalnız erkek ses varsa perdeyi yükseltiriz.
  const nineSesi = () => kadinSesiVar ? { pitch: 0.88, hiz: 0.88 } : { pitch: 1.35, hiz: 0.9 };
  if (ses) { sesSec(); ses.onvoiceschanged = sesSec; }
  let konusulan = null, konusmaBitince = null, oturum = 0, bekci = null, sozler = [];
  function konusmaBitti(no) {
    if (no !== oturum || konusulan == null) return; // eski bir konuşmanın geç gelen olayı
    clearTimeout(bekci); konusulan = null; sozler = []; oynatDugmesi();
    const f = konusmaBitince; konusmaBitince = null; if (f) f();
  }
  const kayit = new Audio(); kayit.preload = 'none';
  function seslendir(metin, kimlik, ozellik) {
    kayit.pause();
    if (!ses) { durum('Bu tarayıcı sesli okumayı desteklemiyor.'); return; }
    ozellik = Object.assign(nineSesi(), ozellik || {});
    ses.cancel(); clearTimeout(bekci); const no = ++oturum; konusulan = kimlik;
    // Uzun metinler bazı tarayıcılarda yarıda kesilir; cümle cümle sıraya koyuyoruz.
    const parcalar = metin.match(/[^.!?…]+[.!?…]+|\S[^.!?…]*$/g) || [metin];
    sozler = parcalar.map((p, i) => {
      const u = new SpeechSynthesisUtterance(p.trim());
      u.lang = 'tr-TR'; u.rate = ayar.hiz * ozellik.hiz; if (turkceSes) u.voice = turkceSes;
      u.pitch = ozellik.pitch;
      if (i === parcalar.length - 1) u.onend = u.onerror = () => konusmaBitti(no);
      ses.speak(u); return u; // referansı tutuyoruz: Chrome aksi halde onend'i kaybedebilir
    });
    // Bekçi: olay hiç gelmezse metin süresinin iki katı sonra kilidi aç
    bekci = setTimeout(() => konusmaBitti(no), Math.max(8000, metin.length * 140 / ayar.hiz));
    oynatDugmesi();
  }
  // Yapı anlatımları: önceden kaydedilmiş Nazlı Nine sesi (kadın, Türkçe) varsa onu çal; yoksa telefonun sesiyle oku
  function konus(id, bitince) {
    const y = YAPI[id]; konusmaBitince = bitince || null;
    if (!y.ses) { seslendir(y.ad + '. ' + y.anlatim, id); return; }
    if (ses) ses.cancel(); clearTimeout(bekci); const no = ++oturum; konusulan = id;
    kayit.src = 'ses/' + y.ses; kayit.playbackRate = ayar.hiz;
    kayit.onended = () => konusmaBitti(no);
    kayit.onerror = () => { if (no === oturum) { konusulan = null; seslendir(y.ad + '. ' + y.anlatim, id); } };
    kayit.play().catch(() => kayit.onerror());
    oynatDugmesi();
  }
  function sus() { kayit.pause(); if (ses) ses.cancel(); clearTimeout(bekci); oturum++; konusulan = null; konusmaBitince = null; sozler = []; evdenTur = false; oynatDugmesi(); }
  function oynatDugmesi() {
    const b = $('#oynatBtn'); if (!b) return;
    b.textContent = konusulan === b.dataset.id ? '⏹ Durdur' : '▶ Dinle';
  }
  function enYakin(sinir = 150) { // sohbet için: yakındaki yapı (koordinat paylaşmadan bağlam vermek üzere)
    if (!sonKonum) return null;
    let en = null, m = Infinity;
    konumlu.forEach(y => { const d = mesafe(sonKonum, [y.lat, y.lon]); if (d < m) { m = d; en = y; } });
    return m <= sinir ? en : null;
  }
  window.KN = { seslendir, sus, bildir, depo, esc, YAPI, D, enYakin, get sonKonum() { return sonKonum; } }; // sohbet modülü kullanır

  // ---------- fotoğraf deposu (IndexedDB) ----------
  const fotoDepo = (() => {
    let db = null;
    function ac() {
      return db ? Promise.resolve(db) : new Promise((ok, hata) => {
        const r = indexedDB.open('kaybolan-nazilli', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('foto', { keyPath: 'anahtar' });
        r.onsuccess = () => { db = r.result; ok(db); }; r.onerror = () => hata(r.error);
      });
    }
    const islem = (kip, f) => ac().then(d => new Promise((ok, hata) => {
      const t = d.transaction('foto', kip), s = t.objectStore('foto'), r = f(s);
      t.oncomplete = () => ok(r && r.result); t.onerror = () => hata(t.error);
    }));
    return {
      ekle: kayit => islem('readwrite', s => s.put(kayit)),
      hepsi: () => islem('readonly', s => s.getAll()),
      sil: anahtar => islem('readwrite', s => s.delete(anahtar)),
      temizle: () => islem('readwrite', s => s.clear())
    };
  })();

  // ---------- yapı kartı ----------
  function foto(f, etiket) {
    if (!f) return `<figure><div class="bos">${etiket === 'Dün' ? 'Eski fotoğraf aranıyor' : 'Bugünkü fotoğraf çekilecek'}</div><figcaption>${etiket}</figcaption></figure>`;
    return `<figure><img src="img/${esc(f.img)}" alt="${esc(f.aciklama)}" data-alt="${esc(f.aciklama + ' · ' + f.yil + ' · Kaynak: ' + f.kaynak)}" loading="lazy"><figcaption><b>${etiket}</b> · ${esc(f.yil)} · ${esc(f.kaynak)}</figcaption></figure>`;
  }
  function karsilastirma(y) {
    // Kaydırmalı dün/bugün: iki foto da varsa
    return `<div class="karsilastir" id="karsilastir" aria-label="Dün ve bugün karşılaştırması, kaydırın">
      <img src="img/${esc(y.bugun.img)}" alt="${esc(y.bugun.aciklama)}">
      <img class="ust-foto" src="img/${esc(y.eski.img)}" alt="${esc(y.eski.aciklama)}">
      <div class="cizgi"></div><span class="yazi sol">Dün · ${esc(y.eski.yil)}</span><span class="yazi sag">Bugün · ${esc(y.bugun.yil)}</span></div>
      <p class="kaynak">Kaynak: ${esc(y.eski.kaynak)} / ${esc(y.bugun.kaynak)}</p>`;
  }
  function karsilastirBagla() {
    const k = $('#karsilastir'); if (!k) return;
    const ust = k.querySelector('.ust-foto'), c = k.querySelector('.cizgi');
    const ayarla = x => { const r = k.getBoundingClientRect(); const o = Math.max(0, Math.min(100, (x - r.left) / r.width * 100)); ust.style.clipPath = `inset(0 ${100 - o}% 0 0)`; c.style.left = o + '%'; };
    let basili = false;
    k.addEventListener('pointerdown', e => { basili = true; k.setPointerCapture(e.pointerId); ayarla(e.clientX); });
    k.addEventListener('pointermove', e => { if (basili) ayarla(e.clientX); });
    k.addEventListener('pointerup', () => { basili = false; });
  }
  function testHtml(y) {
    if (!y.test) return '';
    const kayit = pasaport.test[y.id];
    // Seçenekleri her yapı için sabit ama karışık sırada göster
    // Yapıya özgü tohumla Fisher–Yates karıştırma: her açılışta aynı, ama yapıdan yapıya farklı sıra
    let tohum = [...y.id + y.test.s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
    const rastgele = () => (tohum = (tohum * 1664525 + 1013904223) >>> 0) / 4294967296;
    const sira = y.test.c.map((c, i) => i);
    for (let i = sira.length - 1; i > 0; i--) { const j = Math.floor(rastgele() * (i + 1)); [sira[i], sira[j]] = [sira[j], sira[i]]; }
    return `<div class="test" id="test"><p>❓ ${esc(y.test.s)}</p>${sira.map(i => {
      const sinif = kayit ? (i === y.test.d ? 'dogru' : (i === kayit.secim ? 'yanlis' : '')) : '';
      return `<button data-i="${i}" class="${sinif}" ${kayit ? 'disabled' : ''}>${esc(y.test.c[i])}</button>`;
    }).join('')}${kayit ? `<p class="kaynak">${kayit.dogru ? 'Doğru! +10 puan' : 'Bu sefer olmadı. Doğru cevap yeşil.'}</p>` : ''}</div>`;
  }
  function testBagla(id) {
    const t = $('#test'); if (!t) return;
    t.onclick = e => {
      const b = e.target.closest('button[data-i]'); if (!b || pasaport.test[id]) return;
      const y = YAPI[id], i = +b.dataset.i, dogru = i === y.test.d;
      pasaport.test[id] = { secim: i, dogru }; if (dogru) pasaport.puan += 10; pasaportKaydet();
      uyar(dogru ? [80] : [40, 60, 40]); bildir(dogru ? 'Doğru! +10 puan' : 'Yanlış cevap');
      kartAc(id, false, true); rozetKontrol();
    };
  }
  let acikKart = null;
  function kartAc(id, otomatik, yenile) {
    const y = YAPI[id]; acikKart = id;
    const uzak = sonKonum && y.lat != null ? ' · ' + metreYaz(mesafe(sonKonum, [y.lat, y.lon])) + ' uzakta' : '';
    const videolar = (y.videolar || []).map(v => `<details class="video"><summary>🎬 ${esc(v.baslik)}${v.kanal ? ' · ' + esc(v.kanal) : ''}</summary>
        <div class="video-kutu" data-v="${esc(v.video_id)}"><button class="hap kucuk">Videoyu yükle</button></div></details>`).join('');
    $('#kartIcerik').innerHTML = `
      <h2 id="kartBaslik">${esc(y.ad)}</h2>
      <p class="meta">${esc(y.tur)} · ${esc(y.donem)}${esc(uzak)}</p>
      <span class="etiket" style="background:${renk(y.durum)}">${esc(y.durum)}</span>
      ${y.eski && y.bugun ? karsilastirma(y) : `<div class="ciftler">${foto(y.eski, 'Dün')}${foto(y.bugun, 'Bugün')}</div>`}
      ${y.not ? `<p class="kaynak">${esc(y.not)}</p>` : ''}
      <div class="eylemler">
        <button id="oynatBtn" class="hap" data-id="${esc(id)}">▶ Dinle</button>
        <button id="sorBtn" class="hap">💬 Nine'ye sor</button>
        ${y.eski ? '<button id="pencereBtn" class="hap">🪟 Geçmişe pencere</button>' : ''}
        ${y.eski || y.bugun ? '<button id="cekimBtn" class="hap">📷 Aynı açıdan çek</button>' : ''}
        ${y.lat != null ? '<button id="gitBtn" class="hap">🧭 Buraya git</button>' : '<button id="biliyorumBtn" class="hap">🔎 Yerini biliyorum</button>'}
        <button id="paylasBtn" class="hap">🔗 Paylaş</button>
      </div>
      <p class="anlatim">${esc(y.anlatim)}</p>
      ${y.soru ? `<p class="anlatim"><b>Sizce?</b> ${esc(y.soru)}</p>` : ''}
      ${testHtml(y)}
      ${(y.ek_fotolar || []).length ? `<h3>Arşivden</h3><div class="ciftler">${y.ek_fotolar.map(f => foto(f, f.etiket || 'Arşiv')).join('')}</div>` : ''}
      ${videolar ? `<h3>Videolar</h3>${videolar}` : ''}
      <div id="ziyaretciFotolari" class="ziyaretci"></div>
      <p class="kaynak">Kaynak: ${esc(y.kaynak)}</p>`;
    $('#kart').hidden = false;
    if (!yenile) $('#kart').scrollTop = 0;
    $('#oynatBtn').onclick = () => konusulan === id ? sus() : konus(id);
    $('#sorBtn').onclick = () => { if (window.KN_SOHBET) window.KN_SOHBET.ac(id); };
    const pb = $('#pencereBtn'); if (pb) pb.onclick = () => pencereAc(id, false);
    const cb = $('#cekimBtn'); if (cb) cb.onclick = () => pencereAc(id, true);
    const g = $('#gitBtn'); if (g) g.onclick = () => { rotaGoster(y.ad, [id]); };
    const bb = $('#biliyorumBtn'); if (bb) bb.onclick = () => dedektifBaslat(id);
    $('#paylasBtn').onclick = () => paylas(y.ad + ' – Kaybolan Nazilli', y.anlatim.slice(0, 140) + '…', location.href.split('#')[0] + '#yapi=' + id);
    videoBagla($('#kartIcerik'));
    if (window.KN_ZIYARETCI) window.KN_ZIYARETCI.kartaEkle(id, $('#ziyaretciFotolari'));
    karsilastirBagla(); testBagla(id); oynatDugmesi();
    if (otomatik && ayar.oto) konus(id);
    if (y.lat != null && !otomatik && !yenile) harita.panTo([y.lat, y.lon]);
    history.replaceState(null, '', '#yapi=' + id);
  }
  $('#kartKapat').onclick = () => { $('#kart').hidden = true; acikKart = null; sus(); history.replaceState(null, '', location.pathname + location.search); };
  document.addEventListener('click', e => {
    const i = e.target.closest('img[data-alt]');
    if (i) { $('#buyut img').src = i.src; $('#buyut p').textContent = i.dataset.alt; $('#buyut').hidden = false; }
    else if (e.target.closest('#buyut')) $('#buyut').hidden = true;
  });
  async function paylas(baslik, metin, url, dosya) {
    try {
      if (dosya && navigator.canShare && navigator.canShare({ files: [dosya] })) { await navigator.share({ title: baslik, text: metin, files: [dosya] }); return; }
      if (navigator.share) { await navigator.share({ title: baslik, text: metin, url }); return; }
    } catch (e) { if (e.name === 'AbortError') return; }
    if (dosya) { const a = document.createElement('a'); a.href = URL.createObjectURL(dosya); a.download = dosya.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); return; }
    try { await navigator.clipboard.writeText(url || metin); bildir('Bağlantı kopyalandı'); } catch (e) { prompt('Bağlantıyı kopyalayın:', url || metin); }
  }

  // ---------- geçmişe pencere ve aynı açıdan çekim (kamera) ----------
  let akis = null, pencereYapi = null, cekimModu = false;
  async function pencereAc(id, cekim) {
    const y = YAPI[id], f = y.eski || y.bugun; pencereYapi = id; cekimModu = cekim;
    $('#hayalet').src = 'img/' + f.img;
    $('#pencereBaslik').textContent = (cekim ? 'Aynı açıdan çek: ' : 'Geçmişe pencere: ') + y.ad + ' (' + f.yil + ')';
    $('#cekBtn').hidden = !cekim;
    $('#pencereIpucu').textContent = cekim
      ? 'Eski fotoğraftaki çizgileri canlı görüntüyle örtüştürün, sonra "Çek"e basın. Dün/bugün çifti pasaportunuza kaydedilir.'
      : 'Kaydırıcıyla eski fotoğrafı belirginleştirin. Bulunduğunuz yer eskiden böyle görünüyordu.';
    $('#saydamlik').value = 50; $('#hayalet').style.opacity = .5;
    $('#pencere').hidden = false;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { bildir('Kamera için sayfanın https ile açılması gerekir'); return; }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      if ($('#pencere').hidden) { s.getTracks().forEach(t => t.stop()); return; } // izin beklenirken kapatıldı
      akis = s; $('#kamera').srcObject = akis;
    } catch (e) { bildir(e.name === 'NotAllowedError' ? 'Kamera izni verilmedi' : 'Kamera açılamadı'); }
  }
  function pencereKapat() {
    $('#pencere').hidden = true;
    if (akis) { akis.getTracks().forEach(t => t.stop()); akis = null; }
    $('#kamera').srcObject = null;
  }
  $('#pencereKapat').onclick = pencereKapat;
  $('#saydamlik').oninput = e => { $('#hayalet').style.opacity = e.target.value / 100; };
  $('#cekBtn').onclick = async () => {
    const v = $('#kamera'); if (!v.videoWidth) { bildir('Kamera görüntüsü yok'); return; }
    const c = document.createElement('canvas'); const w = Math.min(1200, v.videoWidth); c.width = w; c.height = Math.round(w * v.videoHeight / v.videoWidth);
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    const blob = await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.85));
    const y = YAPI[pencereYapi], anahtar = pencereYapi + '_' + Date.now();
    try {
      await fotoDepo.ekle({ anahtar, yapi: pencereYapi, ad: y.ad, tarih: new Date().toISOString(), konum: sonKonum, blob, eski: (y.eski || y.bugun).img });
      ziyaretEt(pencereYapi, 'foto'); pasaport.foto = pasaport.foto || {}; pasaport.foto[pencereYapi] = true; pasaportKaydet(); rozetKontrol();
      uyar([60]); bildir('Fotoğraf kaydedildi 📷');
    } catch (e) { bildir('Kaydedilemedi'); }
    pencereKapat(); kartAc(pencereYapi, false, true);
  };

  // ---------- pasaport, ziyaret, rozet ----------
  function ziyaretEt(id, nasil) {
    if (!pasaport.ziyaret[id]) { pasaport.ziyaret[id] = { tarih: new Date().toISOString(), nasil }; pasaportKaydet(); isaretCiz(); rozetKontrol(); }
  }
  const ROZETLER = [
    { id: 'ilk', ad: '🥾 İlk adım', kosul: () => Object.keys(pasaport.ziyaret).length >= 1 },
    { id: 'bes', ad: '🗺️ Kâşif (5 yapı)', kosul: () => Object.keys(pasaport.ziyaret).length >= 5 },
    { id: 'hepsi', ad: '🏆 Nazilli bilgesi (tüm merkez)', kosul: () => merkezde.every(y => pasaport.ziyaret[y.id]) },
    { id: 'demir', ad: '🚂 Demiryolcu', kosul: () => ['KN-08', 'KN-09', 'KN-21'].every(i => pasaport.ziyaret[i]) },
    { id: 'basma', ad: '🧵 Basmacı', kosul: () => ['KN-10', 'KN-11', 'KN-12'].some(i => pasaport.ziyaret[i]) },
    { id: 'osmanli', ad: '🕌 Osmanlı izcisi', kosul: () => ['KN-03', 'KN-04', 'KN-05', 'KN-02'].every(i => pasaport.ziyaret[i]) },
    { id: 'kayip', ad: '🕯️ Kayıpların tanığı', kosul: () => ['KN-01', 'KN-25'].every(i => pasaport.ziyaret[i]) },
    { id: 'quiz', ad: '🧠 Bilgi yarışmacısı (5 doğru)', kosul: () => Object.values(pasaport.test).filter(t => t.dogru).length >= 5 },
    { id: 'foto', ad: '📷 Zaman yolcusu (aynı açı)', kosul: () => Object.keys(pasaport.foto || {}).length >= 1 },
    { id: 'dedektif', ad: '🔎 Dedektif', kosul: () => dedektif.length >= 1 }
  ];
  let kazanilan = new Set(depo.al('rozet', []));
  function rozetKontrol() {
    ROZETLER.forEach(r => {
      if (!kazanilan.has(r.id) && r.kosul()) { kazanilan.add(r.id); depo.koy('rozet', [...kazanilan]); setTimeout(() => { bildir('Yeni rozet: ' + r.ad); uyar([100, 60, 100, 60, 200]); }, 600); }
    });
  }
  let blobAdresleri = [];
  async function pasaportCiz() {
    blobAdresleri.forEach(u => URL.revokeObjectURL(u)); blobAdresleri = [];
    const n = merkezde.filter(y => pasaport.ziyaret[y.id]).length;
    const dogru = Object.values(pasaport.test).filter(t => t.dogru).length;
    $('#pasaportOzet').innerHTML = `<b>${n} / ${merkezde.length}</b> yapı ziyaret edildi · <b>${pasaport.puan}</b> puan · ${dogru} doğru cevap
      <div class="ilerleme"><div style="width:${Math.round(n / merkezde.length * 100)}%"></div></div>`;
    $('#damgalar').innerHTML = konumlu.map(y => `<div class="damga ${pasaport.ziyaret[y.id] ? 'var' : ''}" data-id="${esc(y.id)}"><span class="simge">${y.uzak ? '🏞️' : '🏛️'}</span>${esc(y.ad)}</div>`).join('');
    $('#damgalar').onclick = e => { const d = e.target.closest('[data-id]'); if (d) kartAc(d.dataset.id, false); };
    $('#rozetler').innerHTML = ROZETLER.map(r => `<span class="rozet ${kazanilan.has(r.id) ? 'var' : ''}">${esc(r.ad)}</span>`).join('');
    let fotolar = [];
    try { fotolar = await fotoDepo.hepsi(); } catch (e) { /* IndexedDB yok */ }
    $('#cektiklerim').innerHTML = fotolar.length ? fotolar.sort((a, b) => b.tarih.localeCompare(a.tarih)).map(f => {
      const u = URL.createObjectURL(f.blob); blobAdresleri.push(u);
      return `<figure><img src="${u}" alt="" data-alt="${esc(f.ad + ' · ' + new Date(f.tarih).toLocaleString('tr-TR'))}">
        <figcaption>${esc(f.ad)}<br><button class="hap kucuk" data-paylas="${esc(f.anahtar)}">Paylaş</button> <button class="hap kucuk" data-sil="${esc(f.anahtar)}">Sil</button></figcaption></figure>`;
    }).join('') : '<p class="aciklama">Henüz fotoğraf yok.</p>';
    $('#cektiklerim').onclick = async e => {
      const p = e.target.closest('[data-paylas]'), s = e.target.closest('[data-sil]');
      if (p) { const f = fotolar.find(x => x.anahtar === p.dataset.paylas); paylas(f.ad, 'Kaybolan Nazilli: ' + f.ad + ' bugün', '', new File([f.blob], f.anahtar + '.jpg', { type: 'image/jpeg' })); }
      if (s && confirm('Bu fotoğraf silinsin mi?')) { await fotoDepo.sil(s.dataset.sil); pasaportCiz(); }
    };
    $('#dedektifNotlari').innerHTML = dedektif.length ? dedektif.map((d, i) => `<div class="dedektif"><b>${esc(YAPI[d.yapi]?.ad || d.yapi)}</b><br>
        Konum: ${d.lat.toFixed(5)}, ${d.lon.toFixed(5)}<br>${d.not ? 'Not: ' + esc(d.not) + '<br>' : ''}<span class="kaynak">${new Date(d.tarih).toLocaleString('tr-TR')}</span>
        <br><button class="hap kucuk" data-gonder="${i}">Öğretmene gönder</button></div>`).join('') : '<p class="aciklama">Henüz not yok. Yapılar sekmesinde "Bu nerede?" süzgecine bakın.</p>';
    $('#dedektifNotlari').onclick = e => {
      const b = e.target.closest('[data-gonder]'); if (!b) return; const d = dedektif[+b.dataset.gonder];
      const metin = `Kaybolan Nazilli dedektif notu\nYapı: ${YAPI[d.yapi]?.ad} (${d.yapi})\nKonum: ${d.lat.toFixed(6)}, ${d.lon.toFixed(6)}\nhttps://www.openstreetmap.org/?mlat=${d.lat.toFixed(6)}&mlon=${d.lon.toFixed(6)}#map=19/${d.lat.toFixed(6)}/${d.lon.toFixed(6)}\nNot: ${d.not || '-'}\nTarih: ${new Date(d.tarih).toLocaleString('tr-TR')}`;
      paylas('Dedektif notu', metin, '');
    };
  }
  $('#pasaportPaylas').onclick = async () => {
    const n = merkezde.filter(y => pasaport.ziyaret[y.id]).length;
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const g = c.getContext('2d');
    g.fillStyle = '#faf8f4'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#8a4b2a'; g.fillRect(0, 0, c.width, 220);
    g.fillStyle = '#fff'; g.font = 'bold 72px system-ui, sans-serif'; g.fillText('Kaybolan Nazilli', 60, 130);
    g.font = '36px system-ui, sans-serif'; g.fillText('Gezi pasaportu', 60, 185);
    g.fillStyle = '#1f2328'; g.font = 'bold 120px system-ui, sans-serif'; g.fillText(`${n}/${merkezde.length}`, 60, 400);
    g.font = '40px system-ui, sans-serif'; g.fillText('yapı ziyaret edildi · ' + pasaport.puan + ' puan', 60, 460);
    g.font = '38px system-ui, sans-serif'; let yy = 560;
    ROZETLER.filter(r => kazanilan.has(r.id)).forEach(r => { g.fillText(r.ad, 60, yy); yy += 60; });
    g.font = '30px system-ui, sans-serif'; g.fillStyle = '#5d6670';
    merkezde.filter(y => pasaport.ziyaret[y.id]).slice(0, 10).forEach((y, i) => g.fillText('✓ ' + y.ad, 600, 560 + i * 48));
    g.fillText(new Date().toLocaleDateString('tr-TR'), 60, 1300);
    const blob = await new Promise(ok => c.toBlob(ok, 'image/png'));
    paylas('Kaybolan Nazilli pasaportum', `Nazilli'de ${n} tarihi yapıyı gezdim!`, location.href.split('#')[0], new File([blob], 'kaybolan-nazilli-pasaport.png', { type: 'image/png' }));
  };

  // ---------- dedektif görevi: yeri bilinmeyen yapı ----------
  let dedektifYapi = null;
  function dedektifBaslat(id) {
    dedektifYapi = id; $('#kart').hidden = true; sekmeAc('harita');
    document.body.classList.add('secim-modu');
    durum('🔎 ' + YAPI[id].ad + ': Haritada yapının bulunduğu (ya da bulunduğu) yere dokunun.');
  }
  // ---------- konum takibi ve yaklaşınca anlatım ----------
  let izleme = null, sonKonum = null, benIsaret = null, dogrulukDaire = null, ekranKilidi = null, pusulaAcisi = null;
  const benIkon = L.divIcon({ className: '', html: '<div class="konum-noktasi"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
  function konumGuncelle(lat, lon, acc) {
    sonKonum = [lat, lon];
    if (!benIsaret) { benIsaret = L.marker(sonKonum, { icon: benIkon, zIndexOffset: 1000 }).addTo(harita); harita.setView(sonKonum, 17); }
    else benIsaret.setLatLng(sonKonum);
    if (acc) {
      if (!dogrulukDaire) dogrulukDaire = L.circle(sonKonum, { radius: acc, weight: 1, fillOpacity: .08 }).addTo(harita);
      else dogrulukDaire.setLatLng(sonKonum).setRadius(acc);
    }
    yakinKontrol(); rotaIlerle(); yonGuncelle();
    if (document.querySelector('#sekme-liste.aktif') && filtre === 'yakin') listeCiz();
  }
  function yakinKontrol() {
    if (!sonKonum || evdenTur) return;
    let enYakin = null, enYakinM = Infinity;
    konumlu.forEach(y => { const m = mesafe(sonKonum, [y.lat, y.lon]); if (m < enYakinM) { enYakinM = m; enYakin = y; } });
    if (!enYakin) return;
    const esik = ayar.yaricap * (enYakin.dogruluk === 'OSM' ? 1 : 1.5); // yaklaşık konumlarda daha geniş
    if (enYakinM <= esik) ziyaretEt(enYakin.id, 'konum');
    if (enYakinM <= esik && !dinlenen.has(enYakin.id) && konusulan == null) {
      dinlenen.add(enYakin.id); depo.koy('dinlenen', [...dinlenen]);
      uyar(); durum('Yakınınızda: ' + enYakin.ad);
      kartAc(enYakin.id, true);
    } else if (!aktifRota) {
      durum('En yakın yapı: ' + enYakin.ad + ' · ' + metreYaz(enYakinM));
    }
  }
  async function ekranAcik(ac) {
    try {
      if (ac && 'wakeLock' in navigator) ekranKilidi = await navigator.wakeLock.request('screen');
      else if (!ac && ekranKilidi) { await ekranKilidi.release(); ekranKilidi = null; }
    } catch (e) { /* desteklenmiyor */ }
  }
  function sesKilidiniAc() { // iOS: ses ve konuşma ilk kez bir dokunuşla başlamalı
    if (ses) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; ses.speak(u); }
    try { sesBaglami = sesBaglami || new (window.AudioContext || window.webkitAudioContext)(); sesBaglami.resume(); } catch (e) { /* */ }
  }
  $('#konumBtn').onclick = () => {
    if (izleme != null) {
      navigator.geolocation.clearWatch(izleme); izleme = null;
      $('#konumBtn').setAttribute('aria-pressed', 'false'); $('#konumBtn').textContent = '📍 Gezintiyi başlat';
      durum('Gezinti durduruldu.'); ekranAcik(false); return;
    }
    if (!('geolocation' in navigator)) { durum('Bu cihaz konum desteklemiyor. Ayarlar > Deneme modu ile deneyebilirsiniz.'); return; }
    sesKilidiniAc(); durum('Konum aranıyor… Ekranı açık tutun.');
    izleme = navigator.geolocation.watchPosition(
      p => konumGuncelle(p.coords.latitude, p.coords.longitude, p.coords.accuracy),
      err => {
        const m = { 1: 'Konum izni verilmedi. Telefon ayarlarından izin verin.', 2: 'Konum bulunamadı.', 3: 'Konum zaman aşımına uğradı.' }[err.code] || 'Konum hatası.';
        durum(m + (location.protocol !== 'https:' && location.hostname !== 'localhost' ? ' (Konum için sayfanın https ile açılması gerekir.)' : ''));
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
    $('#konumBtn').setAttribute('aria-pressed', 'true'); $('#konumBtn').textContent = '⏸ Gezintiyi durdur';
    ekranAcik(true);
  };
  document.addEventListener('visibilitychange', () => { if (izleme != null && document.visibilityState === 'visible') ekranAcik(true); });
  harita.on('click', e => {
    if (dedektifYapi) {
      const not = prompt('Kısa bir not ekleyin (kimden duydunuz, yerinde bugün ne var?):', '') || '';
      dedektif.push({ yapi: dedektifYapi, lat: e.latlng.lat, lon: e.latlng.lng, not, tarih: new Date().toISOString() });
      depo.koy('dedektif', dedektif); L.marker(e.latlng).addTo(harita).bindTooltip('🔎 ' + YAPI[dedektifYapi].ad);
      document.body.classList.remove('secim-modu'); dedektifYapi = null; rozetKontrol();
      bildir('Not kaydedildi. Pasaport sekmesinden öğretmene gönderebilirsiniz.'); durum('Dedektif notu kaydedildi.');
      return;
    }
    if ($('#deneme').checked) konumGuncelle(e.latlng.lat, e.latlng.lng, 10);
  });

  // ---------- yön oku ve pusula ----------
  function hedef() {
    if (aktifRota && aktifRota.sira[aktifRota.i]) return YAPI[aktifRota.sira[aktifRota.i]];
    return null;
  }
  let okAcisi = 0;
  function yonGuncelle() {
    const h = hedef();
    if (!h || !sonKonum) { $('#yonKutusu').hidden = true; return; }
    const m = mesafe(sonKonum, [h.lat, h.lon]), a = yon(sonKonum, [h.lat, h.lon]);
    $('#yonKutusu').hidden = false;
    $('#yonAd').textContent = `${aktifRota.i + 1}/${aktifRota.sira.length} · ${h.ad}`;
    $('#yonMesafe').textContent = metreYaz(m) + ' · ' + yurumeDk(m) + ' dk' + (pusulaAcisi == null ? ' · ok kuzeye göre' : '');
    // ➤ simgesi doğuyu (90°) gösterir; pusula varsa telefonun baktığı yöne göre döndür
    const ekran = (screen.orientation && screen.orientation.angle) || 0;
    const hedefAci = a - 90 - (pusulaAcisi ?? 0) - (pusulaAcisi != null ? ekran : 0);
    okAcisi += ((hedefAci - okAcisi) % 360 + 540) % 360 - 180; // en kısa yoldan dön
    $('#yonOk').style.transform = `rotate(${okAcisi}deg)`;
    $('#pusulaBtn').hidden = pusulaAcisi != null || !('DeviceOrientationEvent' in window);
  }
  function pusulaDinle(e) {
    let a = null;
    if (typeof e.webkitCompassHeading === 'number') a = e.webkitCompassHeading; // iOS
    else if (e.absolute && typeof e.alpha === 'number') a = (360 - e.alpha) % 360;
    if (a != null) { pusulaAcisi = a; yonGuncelle(); }
  }
  $('#pusulaBtn').onclick = async () => {
    try {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') { // iOS 13+
        const r = await DeviceOrientationEvent.requestPermission(); if (r !== 'granted') { bildir('Pusula izni verilmedi'); return; }
      }
      window.addEventListener('deviceorientationabsolute', pusulaDinle);
      window.addEventListener('deviceorientation', pusulaDinle);
      bildir('Pusula açıldı; telefonu düz tutun');
    } catch (e) { bildir('Pusula açılamadı'); }
  };

  // ---------- rotalar ----------
  let rotaNo = 0, rotaKatmani = L.layerGroup().addTo(harita), aktifRota = null, sonSapmaUyari = 0, evdenTur = false;
  function sirala(ids, baslangic) { // en yakın komşu
    const kalan = ids.map(i => YAPI[i]).filter(y => y && y.lat != null);
    if (!kalan.length) return [];
    let nokta = baslangic || [kalan[0].lat, kalan[0].lon];
    const sira = [];
    while (kalan.length) {
      let bi = 0, bm = Infinity;
      kalan.forEach((y, i) => { const m = mesafe(nokta, [y.lat, y.lon]); if (m < bm) { bm = m; bi = i; } });
      const y = kalan.splice(bi, 1)[0]; sira.push(y.id); nokta = [y.lat, y.lon];
    }
    return sira;
  }
  async function yolGeometrisi(noktalar) {
    // Çevrimiçiyse gerçek yürüyüş yolunu OSRM'den al; olmazsa düz çizgi.
    if (noktalar.length >= 2) try {
      const k = noktalar.map(p => p[1].toFixed(6) + ',' + p[0].toFixed(6)).join(';');
      const c = new AbortController(); setTimeout(() => c.abort(), 6000);
      const r = await fetch(`https://routing.openstreetmap.de/routed-foot/route/v1/foot/${k}?overview=full&geometries=geojson`, { signal: c.signal });
      const j = await r.json();
      if (j.routes && j.routes[0]) return { yol: j.routes[0].geometry.coordinates.map(c => [c[1], c[0]]), m: j.routes[0].distance, gercek: true };
    } catch (e) { /* çevrimdışı */ }
    let m = 0; for (let i = 1; i < noktalar.length; i++) m += mesafe(noktalar[i - 1], noktalar[i]);
    return { yol: noktalar, m: m * 1.3, gercek: false };
  }
  async function rotaGoster(ad, sira, aciklama) {
    const no = ++rotaNo; evdenTur = false;
    if (!sira.length) return;
    const noktalar = sira.map(i => [YAPI[i].lat, YAPI[i].lon]);
    // Bulunduğunuz yer ilk durağa 3 km'den uzaksa (başka şehirde) rotaya eklenmez
    const tum = sonKonum && mesafe(sonKonum, noktalar[0]) < 3000 ? [sonKonum, ...noktalar] : noktalar;
    durum('Rota hesaplanıyor…');
    const g = await yolGeometrisi(tum);
    if (no !== rotaNo) return; // bu arada başka rota istendi
    rotaKatmani.clearLayers();
    L.polyline(g.yol, { color: css('--accent'), weight: 5, opacity: .85, dashArray: g.gercek ? null : '8 8' }).addTo(rotaKatmani);
    sira.forEach((id, i) => L.marker([YAPI[id].lat, YAPI[id].lon], {
      icon: L.divIcon({ className: '', html: `<div class="numara">${i + 1}</div>`, iconSize: [24, 24], iconAnchor: [12, 12] })
    }).on('click', () => kartAc(id, false)).addTo(rotaKatmani));
    harita.fitBounds(L.latLngBounds(g.yol).pad(0.15));
    const dk = yurumeDk(g.m) + sira.length * 4; // durak başına ~4 dk dinleme
    aktifRota = { ad, sira, i: 0, yol: g.yol };
    $('#rotaOzeti').hidden = false;
    $('#rotaOzeti').innerHTML = `<b>${esc(ad)}</b>${aciklama ? `<p class="aciklama">${esc(aciklama)}</p>` : ''}
      <p class="aciklama">${sira.length} durak · ${metreYaz(g.m)} · yaklaşık ${dk} dakika${g.gercek ? '' : ' (çevrimdışı tahmin; kesikli çizgi düz hattır)'}</p>
      <ol>${sira.map(id => `<li>${esc(YAPI[id].ad)}</li>`).join('')}</ol>
      <button class="hap" id="evdenBtn">🎧 Evden dinle</button> <button class="hap" id="rotaKapat">Rotayı kapat</button>`;
    $('#evdenBtn').onclick = () => evdenDinle();
    $('#rotaKapat').onclick = () => { rotaKatmani.clearLayers(); aktifRota = null; evdenTur = false; sus(); $('#rotaOzeti').hidden = true; yonGuncelle(); durum('Rota kapatıldı.'); };
    durum(`Rota: ${ad} · ilk durak ${YAPI[sira[0]].ad}`);
    yonGuncelle(); sekmeAc('harita');
  }
  function rotaIlerle() {
    if (!aktifRota || !sonKonum || evdenTur) return;
    const id = aktifRota.sira[aktifRota.i]; if (!id) return;
    const m = mesafe(sonKonum, [YAPI[id].lat, YAPI[id].lon]);
    if (m <= ayar.yaricap * 1.5) {
      aktifRota.i++;
      const s = aktifRota.sira[aktifRota.i];
      setTimeout(() => durum(s ? `Sıradaki durak (${aktifRota.i + 1}/${aktifRota.sira.length}): ${YAPI[s].ad} · ${metreYaz(mesafe(sonKonum, [YAPI[s].lat, YAPI[s].lon]))}` : 'Rota tamamlandı. Teşekkürler!'), 1500);
      if (!s) { uyar([100, 60, 100, 60, 300]); bildir('🏁 Rota tamamlandı!'); }
    } else if (ayar.sapma && aktifRota.yol.length > 1) {
      const sapma = cizgiyeUzaklik(sonKonum, aktifRota.yol);
      if (sapma > 70 && Date.now() - sonSapmaUyari > 60000) {
        sonSapmaUyari = Date.now(); uyar([300]);
        bildir('Rotadan çıktınız (' + metreYaz(sapma) + ')');
        if (ses && konusulan == null) seslendir('Rotadan biraz uzaklaştınız. Ok, sıradaki durağın yönünü gösteriyor.', 'sapma');
      }
    }
  }
  function evdenDinle() {
    if (!aktifRota) return;
    evdenTur = true; sesKilidiniAc(); aktifRota.i = 0;
    const sonraki = () => {
      if (!evdenTur || !aktifRota) return;
      const id = aktifRota.sira[aktifRota.i];
      if (!id) { evdenTur = false; bildir('🎧 Sanal tur bitti'); durum('Sanal tur bitti.'); return; }
      harita.flyTo([YAPI[id].lat, YAPI[id].lon], 18, { duration: 1.2 });
      durum(`🎧 Sanal tur ${aktifRota.i + 1}/${aktifRota.sira.length}: ${YAPI[id].ad}`);
      kartAc(id, false, false);
      konus(id, () => { aktifRota.i++; setTimeout(sonraki, 1200); });
    };
    sonraki();
  }
  $('#hazirRotalar').innerHTML = D.rotalar.map((r, i) => `<div class="rota-kart"><h4>${esc(r.ad)}</h4><p>${esc(r.aciklama)}</p>
     <p>${r.duraklar.map(d => esc(YAPI[d]?.ad)).join(' → ')}</p><button class="hap" data-r="${i}">Haritada göster</button></div>`).join('');
  $('#hazirRotalar').onclick = e => {
    const b = e.target.closest('button[data-r]'); if (!b) return;
    const r = D.rotalar[+b.dataset.r];
    rotaGoster(r.ad, r.sirali ? r.duraklar : sirala(r.duraklar, sonKonum), r.aciklama);
  };
  $('#durakSecimi').innerHTML = merkezde.map(y => `<label><input type="checkbox" value="${esc(y.id)}"> ${esc(y.ad)}</label>`).join('');
  $('#rotaOlustur').onclick = () => {
    const ids = [...document.querySelectorAll('#durakSecimi input:checked')].map(x => x.value);
    if (!ids.length) { $('#rotaOzeti').hidden = false; $('#rotaOzeti').textContent = 'En az bir durak seçin.'; return; }
    rotaGoster('Benim rotam', sirala(ids, sonKonum));
  };

  // ---------- liste ----------
  let filtre = 'hepsi';
  function listeCiz() {
    let l;
    if (filtre === 'yakin') {
      if (!sonKonum) { $('#yapiListesi').innerHTML = '<li>Önce haritada "Gezintiyi başlat"a basın (ya da Ayarlar > Deneme modu).</li>'; return; }
      l = konumlu.map(y => [y, mesafe(sonKonum, [y.lat, y.lon])]).sort((a, b) => a[1] - b[1]).slice(0, 7);
    } else {
      l = D.yapilar.filter(y => filtre === 'hepsi' || (filtre === 'nerede' ? y.lat == null : grup(y.durum) === filtre)).map(y => [y, null]);
    }
    $('#yapiListesi').innerHTML = l.map(([y, m]) => {
      const f = y.eski || y.bugun;
      return `<li data-id="${esc(y.id)}">${f ? `<img src="img/${esc(f.img)}" alt="" loading="lazy">` : '<span class="kucuk-bos"></span>'}
        <div><div class="ad">${pasaport.ziyaret[y.id] ? '✓ ' : ''}${esc(y.ad)}</div><div class="alt-satir">${m != null ? '<b>' + metreYaz(m) + '</b> · ' : ''}${esc(y.tur)} · ${esc(y.durum)}${y.lat == null ? ' · 🔎 yeri bilinmiyor' : ''}</div></div></li>`;
    }).join('') || '<li>Bu grupta yapı yok.</li>';
  }
  document.querySelectorAll('.filtre button').forEach(b => b.onclick = () => {
    filtre = b.dataset.f; document.querySelectorAll('.filtre button').forEach(x => x.classList.toggle('secili', x === b)); listeCiz();
  });
  $('#yapiListesi').onclick = e => { const li = e.target.closest('li[data-id]'); if (li) kartAc(li.dataset.id, false); };
  function videoBagla(kok) {
    kok.querySelectorAll('.video-kutu button').forEach(b => b.onclick = () => {
      const k = b.parentElement;
      k.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(k.dataset.v)}" title="Video" allow="encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
    });
  }
  $('#genelVideolar').innerHTML = (D.genel_videolar || []).map(v => `<details class="video"><summary>${esc(v.baslik)}${v.kanal ? ' · ' + esc(v.kanal) : ''}${v.yil ? ' · ' + esc(v.yil) : ''}</summary>
      ${v.neden ? `<p class="kaynak">${esc(v.neden)}</p>` : ''}<div class="video-kutu" data-v="${esc(v.video_id)}"><button class="hap kucuk">Videoyu yükle</button></div></details>`).join('') || '<p class="aciklama">Video yok.</p>';
  videoBagla($('#genelVideolar'));
  listeCiz();

  // ---------- QR / bağlantı ile açılış: #yapi=KN-07 ----------
  function hashAc() {
    const m = location.hash.match(/yapi=(KN-\d+)/);
    if (!m || !YAPI[m[1]]) return;
    if (/qr=1/.test(location.hash)) ziyaretEt(m[1], 'qr'); // yalnızca yapının önündeki QR etiketi ziyaret sayılır
    kartAc(m[1], false);
  }
  window.addEventListener('hashchange', hashAc);
  hashAc();

  // ---------- çevrimdışı ----------
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  window.__knTest = { konumGuncelle, kartAc, rotaGoster, sirala }; // otomatik testler için
})();
