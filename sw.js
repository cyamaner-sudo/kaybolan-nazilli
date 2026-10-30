// Uygulama kabuğunu, verileri ve fotoğrafları önbelleğe alır; harita karoları çevrimiçi gelir.
const SURUM = 'kn-20261030-1207';
const DOSYALAR = [
 "./",
 "index.html",
 "stil.css",
 "uygulama.js",
 "sohbet.js",
 "sayfalar.js",
 "veri.js",
 "qr.html",
 "manifest.webmanifest",
 "ikon/ikon-192.png",
 "ikon/ikon-512.png",
 "ikon/nine.svg",
 "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css",
 "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js",
 "img/B01_etnografya_muzesi_2024.jpg",
 "img/B02_aga_camii_2020.jpg",
 "img/B03_yahya_pasa_camii_2020.jpg",
 "img/B04_istasyon_kontrol_kulesi_2016.jpg",
 "img/B05_osmanli_cesmesi_belediye_meydani_2022.jpg",
 "img/B06_koca_camii.jpg",
 "img/B07_uzun_carsi.jpg",
 "img/B08_dokuzun_hamami.jpg",
 "img/B09_arpaz_kulesi.jpg",
 "img/B10_arpaz_beyler_konagi.jpg",
 "img/B11_fenni_hamam_2024.jpg",
 "img/B12_fenni_hamam_2024_b.jpg",
 "img/B13_fenni_hamam_2024_c.jpg",
 "img/B14_arpaz_kulesi_2025.jpg",
 "img/B15_arpaz_dha.jpg",
 "img/B16_dokuzun_hamami_2020.jpg",
 "img/B17_dokuzun_hamami_2020_b.jpg",
 "img/E01_gar_1940lar.jpg",
 "img/E02_istasyon_meydani.jpg",
 "img/E04_nazilli_1970ler_a.jpg",
 "img/E05_nazilli_1970ler_b.jpg",
 "img/E06_genel_gorunus.jpg",
 "img/E07_ataturk_fabrika_acilisi_1937.jpg",
 "img/E08_fabrika_ataturk_inonu_1937.jpg",
 "img/E09_osmanli_bankasi_subesi_1930.jpg",
 "img/E10_osmanli_bankasi_subesi_salt.jpg",
 "img/akkurnaz2026_tahkimat_s22_2.jpg",
 "img/akkurnaz2026_tahkimat_s23_1.jpg",
 "img/akkurnaz2026_tahkimat_s23_3.jpg",
 "img/akkurnaz2026_tahkimat_s24_2.jpg",
 "img/akkurnaz2026_tahkimat_s25_2.jpg",
 "img/akkurnaz2026_tahkimat_s25_3.jpg",
 "img/atar2013_deprem_s21_1.jpg",
 "img/atar2013_deprem_s22_1.jpg",
 "img/atar2013_deprem_s22_2.jpg",
 "img/bayindir2019_s120_1.jpg",
 "img/bayindir2019_s140_1.jpg",
 "img/bayindir2019_s144_1.jpg",
 "img/bayindir2019_s145_2.jpg",
 "img/bigat2017_s124_1.jpg",
 "img/bigat2017_s140_1.jpg",
 "img/bigat2017_s141_1.jpg",
 "img/bigat2017_s151_1.jpg",
 "img/bigat2017_s157_1.jpg",
 "img/bigat2017_s158_1.jpg",
 "img/bigat2017_s160_1.jpg",
 "img/bigat2017_s161_1.jpg",
 "img/bigat2017_s170_1.jpg",
 "img/bigat2017_s171_1.jpg",
 "img/bigat2017_s171_2.jpg",
 "img/bigat2017_s172_2.jpg",
 "img/bigat2017_s173_1.jpg",
 "img/bigat2017_s174_1.jpg",
 "img/bigat2017_s175_1.jpg",
 "img/bigat2017_s177_1.jpg",
 "img/bigat2017_s179_2.jpg",
 "img/bigat2017_s181_1.jpg",
 "img/bigat2017_s182_1.jpg",
 "img/bigat2017_s186_2.jpg",
 "img/bigat2017_s194_2.jpg",
 "img/bigat2017_s196_1.jpg",
 "img/bigat2017_s198_1.jpg",
 "img/bigat2017_s202_1.jpg",
 "img/bigat2017_s203_1.jpg",
 "img/bigat2017_s222_1.jpg",
 "img/bigat2017_s224_1.jpg",
 "img/bigat2017_s225_1.jpg",
 "img/bigat2017_s232_1.jpg",
 "img/bigat2017_s236_1.jpg",
 "img/bigat2017_s239_1.jpg",
 "img/bigat2017_s245_1.jpg",
 "img/bigat2017_s249_1.jpg",
 "img/bigat2017_s254_2.jpg",
 "img/bigat2017_s257_1.jpg",
 "img/bigat2017_s261_1.jpg",
 "img/bigat2017_s261_2.jpg",
 "img/bigat2017_s263_1.jpg",
 "img/bigat2017_s265_1.jpg",
 "img/bigat2017_s288_1.jpg",
 "img/bigat2017_s290_1.jpg",
 "img/bigat2017_s326_1.jpg",
 "img/bigat2017_s341_1.jpg",
 "img/bigat2017_s342_2.jpg",
 "img/cirik2024_sumerbank_lojman_s5_2.jpg",
 "img/cirik2024_sumerbank_lojman_s7_1.jpg",
 "img/cirik2024_sumerbank_lojman_s7_2.jpg",
 "img/cirik2024_sumerbank_lojman_s7_3.jpg",
 "img/cirik2024_sumerbank_lojman_s7_4.jpg",
 "img/gokce2021_agacami_s51_1.jpg",
 "img/gokce2021_agacami_s51_3.jpg",
 "img/gokce2021_yahyapasa_s34_1.jpg",
 "img/gokce2021_yahyapasa_s35_1.jpg",
 "img/gokce2021_yahyapasa_s35_2.jpg",
 "img/hurol2011_s20_1.jpg",
 "img/hurol2011_s84_2.jpg",
 "img/hurol2011_s85_1.jpg",
 "img/hurol2011_s86_2.jpg",
 "img/hurol2011_s93_1.jpg",
 "img/hurol2011_s97_1.jpg",
 "img/hurolC_s15_1.jpg",
 "img/hurolC_s16_1.jpg",
 "img/hurolC_s20_1.jpg",
 "img/hurolC_s20_2.jpg",
 "img/hurolC_s25_1.jpg",
 "img/hurolC_s25_2.jpg",
 "img/hurolC_s2_1.jpg",
 "img/hurolC_s2_2.jpg",
 "img/hurolC_s41_1.jpg",
 "img/hurolC_s41_2.jpg",
 "img/hurolC_s42_1.jpg",
 "img/hurolC_s42_2.jpg",
 "img/hurolC_s4_1.jpg",
 "img/hurolC_s5_1.jpg",
 "img/hurolC_s5_2.jpg",
 "img/hurolC_s8_1.jpg",
 "img/hurolC_s8_2.jpg",
 "img/hurolC_s9_1.jpg",
 "img/hurolC_s9_2.jpg",
 "img/jau2023_s4_1.jpg",
 "img/jau2023_s4_2.jpg",
 "img/jau2023_s5_1.jpg",
 "img/jau2023_s6_2.jpg",
 "img/jau2023_s6_3.jpg",
 "img/jau2023_s8_1.jpg",
 "img/jau2023_s8_2.jpg",
 "img/jau2023_s8_4.jpg",
 "img/jau2023_s9_1.jpg",
 "img/jau2023_s9_3.jpg",
 "img/jau2023_s9_4.jpg",
 "img/keskinurmak2024_s10_2.jpg",
 "img/keskinurmak2024_s11_1.jpg",
 "img/keskinurmak2024_s12_1.jpg",
 "img/kitap_45586_s2_1.jpg"
];

self.addEventListener('install', e => {
  // Çekirdek dosyalar mutlaka; fotoğraflar tek tek (biri inmezse kurulum bozulmasın)
  const cekirdek = DOSYALAR.filter(u => !u.startsWith('img/')), resimler = DOSYALAR.filter(u => u.startsWith('img/'));
  e.waitUntil(caches.open(SURUM).then(c => c.addAll(cekirdek.map(u => new Request(u, { cache: 'reload' })))
    .then(() => Promise.all(resimler.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  // Yalnızca bu uygulamanın eski önbelleklerini sil (aynı adreste başka uygulamalar olabilir)
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x.startsWith('kn-') && x !== SURUM && x !== SURUM + '-karo' && x !== 'kn-ses').map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
const KARO_SINIRI = 400; // yaklaşık bir ilçe merkezi, birkaç yakınlaştırma düzeyi
let sinirlaniyor = false;
async function karoSinirla(c) {
  if (sinirlaniyor) return; sinirlaniyor = true;
  try { const k = await c.keys(); for (const r of k.slice(0, Math.max(0, k.length - KARO_SINIRI))) await c.delete(r); } finally { sinirlaniyor = false; }
}
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (u.hostname.endsWith('tile.openstreetmap.org')) {
    // Görülen harita karolarını sakla; çevrimdışıyken en azından gezilen bölge görünsün.
    e.respondWith(caches.open(SURUM + '-karo').then(c => c.match(e.request).then(r => r || fetch(e.request).then(n => {
      if (n.ok || n.type === 'opaque') c.put(e.request, n.clone()).then(() => karoSinirla(c));
      return n;
    }))));
    return;
  }
  if (u.hostname.startsWith('routing.') || u.hostname.endsWith('workers.dev')) return; // canlı sunucu istekleri önbelleğe girmez
  if (u.pathname.includes('/ses/') && u.pathname.endsWith('.mp3')) {
    // Anlatım sesleri dinlendikçe saklanır (hepsini baştan indirmek ~8 MB olurdu)
    e.respondWith(caches.open('kn-ses').then(c => c.match(e.request).then(r => r || fetch(e.request).then(n => { if (n.ok) c.put(e.request, n.clone()); return n; }))));
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
