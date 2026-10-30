// Kaybolan Nazilli – "Nazlı Nine" ile sohbet
// Üç çalışma biçimi:
//  1) sunucu : Ayarlar'da girilen ara sunucu (araclar/sunucu/worker.js) adresine sorar; API anahtarı sunucuda kalır. Okulda önerilen yol.
//  2) anahtar: Öğretmenin kendi Claude API anahtarıyla doğrudan sorar (yalnızca deneme için; anahtar bu telefonda saklanır).
//  3) yerel  : İnternet ya da anahtar yoksa, uygulamadaki bilgilerden en uygun cümleleri bulup Nine'nin ağzından söyler.
(function () {
  'use strict';
  const KN = window.KN, D = KN.D, YAPI = KN.YAPI, esc = KN.esc, depo = KN.depo;
  const K = D.karakter;
  const $ = s => document.querySelector(s);

  // ---------- arayüz ----------
  const kutu = document.createElement('div');
  kutu.className = 'sohbet'; kutu.hidden = true; kutu.setAttribute('role', 'dialog'); kutu.setAttribute('aria-label', K.ad + ' ile sohbet');
  kutu.innerHTML = `
    <div class="sohbet-ust"><img src="${esc(K.resim)}" alt="">
      <div><div class="ad">${esc(K.ad)}</div><div class="alt-yazi">Kurgusal karakter · <span id="sohbetMod" class="mod-etiket"></span></div></div>
      <button class="hap kucuk" id="sohbetSesli" aria-pressed="false" aria-label="Cevapları sesli oku">🔈</button>
      <button class="hap kucuk" id="sohbetKapat" aria-label="Sohbeti kapat">✕</button></div>
    <div class="mesajlar" id="mesajlar" aria-live="polite"></div>
    <div class="oneriler" id="oneriler"></div>
    <form class="sohbet-alt" id="sohbetForm">
      <input id="soruGir" autocomplete="off" maxlength="300" placeholder="Nine'ye bir soru sor…" aria-label="Soru">
      <button type="button" id="mikrofon" aria-label="Sesle sor">🎤</button>
      <button type="submit" aria-label="Gönder">➤</button>
    </form>`;
  document.body.appendChild(kutu);

  // Ayarlar sekmesine sohbet ayarları
  const ayarHtml = document.createElement('div');
  ayarHtml.innerHTML = `<h3>${esc(K.ad)} (yapay zekâ)</h3>
    <p class="aciklama">Sunucu adresi girilirse Nine, Claude yapay zekâsıyla canlı cevap verir. Boş bırakılırsa uygulamadaki bilgilerden cevap verir (internetsiz de çalışır).</p>
    <label class="ayar">Sunucu adresi <input id="sohbetSunucu" type="url" placeholder="https://...workers.dev" style="width:100%"></label>
    <details class="ayar"><summary>Öğretmen deneme modu (API anahtarı)</summary>
      <p class="aciklama">Anahtar kaydedilmez (sayfa kapanınca silinir) ve doğrudan Anthropic'e gönderilir. Öğrenci telefonlarında kullanmayın; okulda sunucu adresini kullanın.</p>
      <input id="sohbetAnahtar" type="password" autocomplete="off" placeholder="sk-ant-..." style="width:100%"></details>`;
  $('#sekme-ayarlar').insertBefore(ayarHtml, $('#sekme-ayarlar h3'));
  const ayar = Object.assign({ sunucu: 'https://nazli-nine.cyamaner.workers.dev', sesli: true }, depo.al('sohbet', {}), { anahtar: '' });
  const kaydet = () => depo.koy('sohbet', { sunucu: ayar.sunucu, sesli: ayar.sesli }); // API anahtarı kaydedilmez, sayfa kapanınca silinir
  $('#sohbetSunucu').value = ayar.sunucu; $('#sohbetAnahtar').value = ayar.anahtar;
  $('#sohbetSunucu').onchange = e => { ayar.sunucu = e.target.value.trim(); kaydet(); };
  $('#sohbetAnahtar').onchange = e => { ayar.anahtar = e.target.value.trim(); kaydet(); };
  function mod() { return ayar.sunucu ? 'sunucu' : ayar.anahtar ? 'anahtar' : 'yerel'; }
  function modYaz() { $('#sohbetMod').textContent = { sunucu: 'yapay zekâ', anahtar: 'yapay zekâ (deneme)', yerel: 'çevrimdışı bilgi' }[mod()]; }
  function sesliYaz() { $('#sohbetSesli').textContent = ayar.sesli ? '🔊' : '🔈'; $('#sohbetSesli').setAttribute('aria-pressed', ayar.sesli); }
  $('#sohbetSesli').onclick = () => { ayar.sesli = !ayar.sesli; kaydet(); sesliYaz(); if (!ayar.sesli) KN.sus(); };
  sesliYaz();

  let gecmis = [], baglam = null, bekliyor = false;
  function mesajEkle(kim, metin, kaynak) {
    const m = document.createElement('div'); m.className = 'mesaj ' + kim;
    m.textContent = metin;
    if (kaynak) { const k = document.createElement('span'); k.className = 'kaynak'; k.textContent = kaynak; m.appendChild(k); }
    $('#mesajlar').appendChild(m); $('#mesajlar').scrollTop = $('#mesajlar').scrollHeight;
    return m;
  }
  function onerileriCiz() {
    const y = baglam && YAPI[baglam];
    const liste = y ? [`${y.ad} ne zaman yapıldı?`, `${y.ad} neden önemli?`, 'Sen bunu gördün mü nine?', 'Eskiden burada ne vardı?'] : K.oneriler;
    $('#oneriler').innerHTML = liste.map(o => `<button class="hap" type="button">${esc(o)}</button>`).join('');
    $('#oneriler').onclick = e => { const b = e.target.closest('button'); if (b) sor(b.textContent); };
  }
  function ac(yapiId) {
    baglam = yapiId || null; kutu.hidden = false; modYaz(); onerileriCiz();
    if (!$('#mesajlar').children.length || yapiId) {
      const y = yapiId && YAPI[yapiId];
      const selam = y ? `Gel evladım, otur şöyle. ${y.ad} hakkında ne merak ediyorsun?` : K.selam;
      mesajEkle('nine', selam);
      if (ayar.sesli) KN.seslendir(selam, 'nine');
    }
    setTimeout(() => $('#soruGir').focus(), 100);
  }
  $('#sohbetKapat').onclick = () => { kutu.hidden = true; KN.sus(); };
  $('#sohbetForm').onsubmit = e => { e.preventDefault(); const s = $('#soruGir').value.trim(); if (s) sor(s); };

  async function sor(soru) {
    if (bekliyor) return;
    $('#soruGir').value = ''; mesajEkle('ben', soru);
    const bekle = mesajEkle('nine', '…'); bekliyor = true;
    let cevap, kaynak = '', hataOldu = false;
    try {
      if (mod() === 'yerel') ({ cevap, kaynak } = yerelCevap(soru));
      else cevap = await yapayZeka(soru);
    } catch (e) {
      hataOldu = true; const yedek = yerelCevap(soru);
      cevap = 'Aman, sesim gidip geliyor (bağlantı kurulamadı). Bildiğimi söyleyeyim: ' + yedek.cevap; kaynak = yedek.kaynak;
    }
    bekle.remove(); mesajEkle('nine', cevap, kaynak); bekliyor = false;
    if (!hataOldu) gecmis.push({ role: 'user', content: soru.slice(0, 300) }, { role: 'assistant', content: cevap.slice(0, 650) });
    gecmis = gecmis.slice(-12); // son 6 soru-cevap
    if (ayar.sesli) KN.seslendir(cevap, 'nine');
  }

  // ---------- yapay zekâ ----------
  function baglamMetni() {
    const y = baglam && YAPI[baglam];
    const yakin = KN.enYakin ? KN.enYakin() : null; // koordinat gönderilmez; yalnızca yakındaki yapının adı
    const yer = yakin ? `Kullanıcı şu an ${yakin.ad} yakınında.` : '';
    return (y ? `Kullanıcı şu an "${y.ad}" (${y.id}) kartından soruyor. ` : '') + yer;
  }
  async function yapayZeka(soru) {
    const mesajlar = [...gecmis, { role: 'user', content: (baglamMetni() ? '[' + baglamMetni() + ']\n' : '') + soru }];
    if (mod() === 'sunucu') {
      const c = new AbortController(); const t = setTimeout(() => c.abort(), 30000);
      const r = await fetch(ayar.sunucu, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mesajlar }), signal: c.signal });
      clearTimeout(t);
      if (!r.ok) throw new Error('sunucu ' + r.status);
      const j = await r.json(); if (!j.cevap) throw new Error('boş cevap');
      return j.cevap;
    }
    // Öğretmen deneme modu: resmî Anthropic SDK'sı tarayıcıda
    const { default: Anthropic } = await import('https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.134.0/+esm');
    const client = new Anthropic({ apiKey: ayar.anahtar, dangerouslyAllowBrowser: true });
    const yanit = await client.beta.messages.create({
      model: K.model,
      max_tokens: 1024,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system: [{ type: 'text', text: K.sistem, cache_control: { type: 'ephemeral' } }],
      messages: mesajlar
    });
    if (yanit.stop_reason === 'refusal') return 'Bu soruya cevap veremem evladım. Gel, sana Nazilli\'nin eski yapılarını anlatayım.';
    return yanit.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
  }

  // ---------- çevrimdışı cevap: bilgi tabanından en uygun cümleler ----------
  const DURAK = new Set(('bir bu şu ve ile de da mi mı mu mü ne neden nasıl hangi kim kaç ben sen o biz siz onlar için gibi çok daha en var yok nedir neydi oldu olan '
    + 'eski nine bana bize anlat söyle zaman nerede burada şimdi nazilli nazillinin nazilliye nazilliyi nazillide nazilliden').split(' '));
  const kok = w => w.length > 5 ? w.slice(0, 5) : w; // kaba Türkçe kök
  const kelimeler = t => t.toLocaleLowerCase('tr').replace(/['’]/g, '').replace(/[^a-zçğıöşü0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !DURAK.has(w)).map(kok);
  const cumlele = t => (t.match(/[^.!?]+[.!?]+/g) || [t]).map(c => ({ c: c.trim(), k: new Set(kelimeler(c)) }));
  const dizin = D.yapilar.map(y => ({ y, ad: new Set(kelimeler(y.ad + ' ' + (y.diger || '') + ' ' + (y.tur || ''))), cumleler: cumlele(y.anlatim) }));
  (K.genel || []).forEach(g => dizin.push({ y: null, ad: new Set(), cumleler: cumlele(g) }));
  function yerelCevap(soru) {
    const s = soru.toLocaleLowerCase('tr');
    if (/^(merhaba|selam|günaydın|iyi akşamlar|iyi günler)/.test(s)) return { cevap: "Aleyküm selam evladım, hoş geldin! Nazilli'nin eski yapılarından hangisini merak ediyorsun?", kaynak: '' };
    if (/kimsin|adın ne|sen kim|gerçek mi/.test(s)) return { cevap: K.tanitim, kaynak: '' };
    if (/teşekkür|sağ ol|eyvallah/.test(s)) return { cevap: 'Sen sağ ol yavrum. Yaşlılara sormayı unutma, her birinin hafızası bir kütüphanedir.', kaynak: '' };
    const k = kelimeler(soru);
    let en = null, enP = 0;
    dizin.forEach(d => {
      let p = 0;
      k.forEach(w => {
        if (d.ad.has(w)) p += 3;
        let c = 0; d.cumleler.forEach(x => { if (x.k.has(w)) c++; }); p += Math.min(c, 2); // aynı kelime bir yapıda en çok 2 puan
      });
      if (d.y && baglam === d.y.id) p += 1.5;
      if (p > enP) { enP = p; en = d; }
    });
    const bilmiyorum = { cevap: 'Onu bilmiyorum evladım, uydurmak da istemem. Mahallenin yaşlılarına sor; öğrendiğini öğretmenine yaz, bu uygulamaya eklensin.', kaynak: '' };
    if (!en || enP < Math.min(2, k.length)) return bilmiyorum; // tek anahtar kelimeli sorularda 1 eşleşme yeter
    let secilen = en.cumleler.map((c, i) => ({ ...c, i, p: k.filter(w => c.k.has(w)).length })).filter(c => c.p > 0).sort((a, b) => b.p - a.p || a.i - b.i).slice(0, 2);
    if (!secilen.length) secilen = en.cumleler.slice(0, 2).map((c, i) => ({ ...c, i }));
    // Seçilen cümleden sonraki cümle bağlam için eklenir (tek cümleyse)
    if (secilen.length === 1 && en.cumleler[secilen[0].i + 1]) secilen.push({ ...en.cumleler[secilen[0].i + 1], i: secilen[0].i + 1 });
    secilen.sort((a, b) => a.i - b.i);
    const giris = ['Bak evladım, ', 'Anlatayım: ', 'Ah, onu iyi bilirim. ', 'Dinle bakalım: '][Math.floor(Math.random() * 4)];
    return { cevap: giris + secilen.map(c => c.c).join(' '), kaynak: en.y ? 'Kaynak: ' + en.y.kaynak : 'Kaynak: uygulamanın genel bilgi notları' };
  }

  // ---------- sesle sorma ----------
  const TanimaSinifi = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!TanimaSinifi) $('#mikrofon').hidden = true;
  else {
    let tanima = null;
    $('#mikrofon').onclick = () => {
      if (tanima) { tanima.stop(); return; }
      KN.sus();
      tanima = new TanimaSinifi(); tanima.lang = 'tr-TR'; tanima.interimResults = true; tanima.maxAlternatives = 1;
      $('#mikrofon').classList.add('dinliyor');
      tanima.onresult = e => { const t = [...e.results].map(r => r[0].transcript).join(''); $('#soruGir').value = t; if (e.results[e.results.length - 1].isFinal) { tanima.stop(); sor(t); } };
      tanima.onerror = e => { KN.bildir({ 'not-allowed': 'Mikrofon izni verilmedi', 'service-not-allowed': 'Bu modda sesle soru desteklenmiyor; Safari\'de açın', 'no-speech': 'Ses duyulmadı, tekrar deneyin', 'network': 'Sesle soru için internet gerekiyor' }[e.error] || 'Mikrofon hatası'); };
      tanima.onend = () => { $('#mikrofon').classList.remove('dinliyor'); tanima = null; };
      tanima.start();
    };
  }

  // Harita üzerinde Nine düğmesi
  const nineBtn = document.createElement('button');
  nineBtn.className = 'nine-dugme'; nineBtn.setAttribute('aria-label', K.ad + ' ile konuş');
  nineBtn.innerHTML = `<img src="${esc(K.resim)}" alt="">`;
  nineBtn.onclick = () => ac(null);
  $('#sekme-harita').appendChild(nineBtn);

  window.KN_SOHBET = { ac, yerelCevap };
})();
