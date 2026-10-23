// Pazar yerlerinde daha önce yazılmış yorumlar.
//
// KVKK notu: Kullanıcı adları burada da kısaltılmış olarak duruyor (ör. "Ma•••ur"):
// tam ad ne sitede ne de sitenin kodunda (ya da GitHub'da) görünür.
// Kaynağı merak eden, yorumun altındaki "Dolap" / "Gardrops" bağlantısıyla
// profilindeki asıl yorumu görebilir.
//
// Dolap yorumları Dolap'ın web sitesinde görünmüyor (sadece uygulamada açılıyor);
// uygulamadaki ekran görüntülerinden aktarıldı (Ekim 2026). Dolap'ın değerlendirme
// listesinde alıcı adı görünmediği için bu yorumlarda ad yok, "Dolap alıcısı" yazar.
// Yazısız (sadece yıldızlı) değerlendirmeler ve kılıf dışı ürünler alınmadı.

export type Review = {
  source: "dolap" | "gardrops";
  user?: string; // Dolap'ta görünmüyor
  date?: string; // YYYY-AA-GG
  text: string;
};

const gardrops: Review[] = [
  {
    source: "gardrops",
    user: "Ma•••ur",
    text: "teşekkürler, özel ölçü olmasına rağmen ajanda kılıfı tam istediğim gibi oldu, emeğinize sağlık. kalemlerde çok çok güzel, bir tanesinin ince ucu yazmıyormuş ama umarım zamanla mürekkebi açılır, teşekkür ederim tekrardan 🌸🫶🏻",
  },
  {
    source: "gardrops",
    user: "gl•••en",
    text: "O kadar tatlı ki delirdim ellerine sağlık çok güzel 😭🥹💖",
  },
  {
    source: "gardrops",
    user: "gi•••em",
    text: "Çok beğendim, çok güzel olmuş kılıfım. Özenli paketleme ve küçük hediye için de teşekkür ederim",
  },
  {
    source: "gardrops",
    user: "hl•••lu",
    text: "Çok beğendim. Tam oldu. Elinize emeğinize sağlık 🌺",
  },
  {
    source: "gardrops",
    user: "Dr•••rd",
    text: "Mükemmel ellerinize sağlık bayıldımmmm, sticker icin de cok teşekkür ederimm",
  },
  {
    source: "gardrops",
    user: "nu•••op",
    text: "Ürün beklentimi karşıladı ve son derece kaliteli. Benden dolayı bir kargo sorunu olmuştu fakat satıcı bana çok yardımcı oldu. Teşekkür ederim tekrardan🤍🌸",
  },
  {
    source: "gardrops",
    user: "ir•••wo",
    text: "çooooook beğendiiim özenle paketlenmiş ve hazırlanmış ellerinize sağlık🥹💞🌟💞💕✨️",
  },
  {
    source: "gardrops",
    user: "gl•••th",
    text: "Tam istedigim gibi oldu tesekkur ederim 🤍",
  },
  {
    source: "gardrops",
    user: "ha•••ia",
    text: "çok kibar ve tatlı bir satıcıı kılıflar da çok güzeldi teşekkür ederim 💕🥹🌷",
  },
  {
    source: "gardrops",
    user: "ed•••zx",
    text: "Hemen kullandım ajandalarıma, çok güzel oldu 🌸 Teşekkürleer 🙏",
  },
  {
    source: "gardrops",
    user: "li•••da",
    text: "Elinize emeğinize sağlık çok güzel olmuşlar, ayrıca stickerlar için de teşekkür ederim :)",
  },
  {
    source: "gardrops",
    user: "By•••kk",
    text: "Çok özenli kargolandı. Ürüne bayıldııımm⭐️",
  },
  {
    source: "gardrops",
    user: "ru•••ku",
    text: "bayıldım 😭🩷 kargoda yardımcı olduğunuz icin sağolunn",
  },
  {
    source: "gardrops",
    user: "Ma•••ur",
    text: "ürün söylendiği gibiydi, özenli paketlenmiş hediye içinde teşekkürler 🌸🌸",
  },
  {
    source: "gardrops",
    user: "ha•••ia",
    text: "teşekkür ederim kılıf yine harikaydııı 💕🌷😻",
  },
  {
    source: "gardrops",
    user: "un•••ds",
    text: "Harikaaaa kesinlikle son siparisim olmaz",
  },
  {
    source: "gardrops",
    user: "mi•••or",
    text: "Çok güzel, teşekkür ederim ellerinize sağlık💗",
  },
  {
    source: "gardrops",
    user: "gl•••th",
    text: "Elinize saglik cok guzeller ayrica guzel paketlemeniz icin de tesekkur ederim",
  },
];

const dolap: Review[] = [
  { source: "dolap", date: "2026-10-22", text: "kategorilerde hobonichi weeks olmamasına rağmen ölçülerine göre mükemmel bir kılıf yaptınız, inanılmaz tatlı bir oldu ajandam için, lütfen alırken tereddüt bile etmeyinn bayıldım 🌸🌸🌸🌸🌸💕💕💕💕💕💕" },
  { source: "dolap", date: "2026-09-11", text: "iletişiminiz ve fiyat konusunda beni kırmadığınız için teşekkür ederim 💗 hayırlı bol kazançlar diliyorum🌷" },
  { source: "dolap", date: "2026-08-22", text: "o kadar güzel ki tam oldu ve çok hızlı kargolandı elinize sağlık çok teşekkür ederim 💗💗" },
  { source: "dolap", date: "2026-07-29", text: "Çok güzel geldi ürün, etrafı patpatla sarılmıştı zarar görmemesi için. hemen deftere taktım, eline emeğine sağlıkk💗" },
  { source: "dolap", date: "2026-07-21", text: "Çok güzel tam oldu Prev ajandam için çok teşekkür ederim 💖" },
  { source: "dolap", date: "2026-07-07", text: "Çok güzel olmuş ellerinize sağlık bayıldım" },
  { source: "dolap", date: "2026-05-25", text: "Satıcıya süreç boyunca gösterdiği ilgi ve özen için minnettarım 🫶🏻 Kılıf özenle hazırlanmış ve çok güzel paketlenmiş bir şekilde elime ulaştı 💝" },
  { source: "dolap", date: "2026-03-25", text: "Artık ajandamın bir yağmurluğu varrrr. Çok tatlı oldu. Beni kırmayıp birazcık büyük yaptığınız için çok teşekkürler. Çok ilgili ve çok nazikti satıcı. Hızlı kargolama içinde ayrıca teşekkür ederim. ✨🤎🥹💐" },
  { source: "dolap", date: "2026-03-25", text: "Ajandamın eksik parçasıymış, bayıldım. 🥲🥲 Ürün anlatıldığı gibiydi ajandama da tam oldu. Ellerinize sağlık. 🩵🩵" },
  { source: "dolap", date: "2026-03-25", text: "Çok beğendim teşekkür ederimm🥹💜" },
  { source: "dolap", date: "2026-03-07", text: "Ürünleri çok beğendim tam oldular." },
  { source: "dolap", date: "2026-03-05", text: "cok tatli paketlenmisti. boyle isletmelerden alisveris yapmayi cok seviyorum ya💖💖💖 tesekkur ederim" },
  { source: "dolap", date: "2026-02-25", text: "Çok beğendimmm teşekkür ederim" },
  { source: "dolap", date: "2026-02-23", text: "Çok beğendim, defterime de çok yakıştı teşekkür ederim 💞💞 Ellerinize sağlık" },
  { source: "dolap", date: "2026-02-18", text: "Çok güzel elinize sağlık💖🫶🏻" },
  { source: "dolap", date: "2026-02-17", text: "paketlenesi cok tatlıstı teşekkürler tam uydu ajandama 💗" },
  { source: "dolap", date: "2026-02-12", text: "asırıı guzell bır kılıf ajandamada cok yakıstı satıcıda asırı tatlıydıı💗💗💗💗" },
  { source: "dolap", date: "2026-02-12", text: "Çok güzel oldu ellerinize sağlık💖" },
  { source: "dolap", date: "2026-02-12", text: "Çok tatlı bir paket halinde geldi gerçekten uğraşılmış kendisine ilgisi için çok teşekkür ederimm💌❤️" },
  { source: "dolap", date: "2026-02-05", text: "Özenli paketliydi emeğiniz için teşekkürler❤️" },
  { source: "dolap", date: "2026-01-29", text: "Çok özenle paketlenmişti ve kılıf da defterimi güzelce sarmalıyor, teşekkür ederim. 🤩🤍✨" },
  { source: "dolap", date: "2026-01-23", text: "çok güzel çok beğendim elinize sağlık hediyeler için teşekkürler💘" },
  { source: "dolap", date: "2026-01-23", text: "Bayıldımmm çok güzell çok teşekkür ederim 😊🙏🏻❤️‍🔥" },
  { source: "dolap", date: "2026-01-19", text: "Bayildim tesekkurler" },
  { source: "dolap", date: "2026-01-18", text: "bayildimm elinize saglikk 🌸🥹🫶🏻💗" },
  { source: "dolap", date: "2026-01-17", text: "o kadar harika bir ürün ko bayıldım satıcı da çok tatlı ve ilgiliydi 💗 sonunda ajandami korkmadan hep çantamda taşıyabileceğim 🥹🫶" },
  { source: "dolap", date: "2026-01-15", text: "Çok güzel elinize sağlık" },
];

/** İki mağazanın yorumları sırayla karışık: duvarın başında ikisi de görünsün */
export const reviews: Review[] = Array.from({ length: Math.max(gardrops.length, dolap.length) }, (_, i) =>
  [gardrops[i], dolap[i]].filter((r): r is Review => !!r),
).flat();

export function maskName(name: string) {
  if (name.length <= 3) return name[0] + "•••";
  return name.slice(0, 2) + "•••" + name.slice(-2);
}
