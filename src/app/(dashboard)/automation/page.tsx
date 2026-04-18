"use client";

import { Zap } from "lucide-react";
import { ComingSoonPage } from "@/components/ui/coming-soon";

export default function AutomationPage() {
  return (
    <ComingSoonPage
      icon={Zap}
      title="Otomasyon ve Akıllı Takip"
      subtitle="Hatırlatmalar, otomatik mesaj serileri, satış hunisi tetikleyicileri"
      eta="Faz 3"
      description="Sık tekrarlanan işleri (takip mesajları, gözden kaçmış müşteriler, ilan güncellemeleri) kural bazlı olarak otomatikleştirir. 'Gösterimden 3 gün sonra müşteriye teşekkür mesajı gönder', 'İki haftadır iletişim kurulmamış müşterileri bana listele' gibi senaryoları tek seferlik kurup bırakırsınız."
      plannedFeatures={[
        { title: "Zamanlı Mesaj Dizisi", description: "Yeni kayıt olan bir müşteriye 1. gün hoşgeldin, 3. gün ilan önerileri, 7. gün danışman araması hatırlatıcısı — otomatik." },
        { title: "Olay Bazlı Tetikleyiciler", description: "'İlan satıldı olarak işaretlendiğinde sahibine teşekkür e-postası', 'Teklif yapıldığında müdüre bildirim' gibi kurallar." },
        { title: "Soğuyan Müşteri Uyarısı", description: "Belirli süredir iletişim kurulmamış müşterileri otomatik hatırlatma listesine çıkarır; danışmana görev olarak atar." },
        { title: "Fiyat Güncelleme Takibi", description: "Portföydeki ilanın fiyatı değiştiğinde o ilana ilgilenen müşterilere otomatik bilgilendirme." },
        { title: "Satış Hunisi Aşaması", description: "Müşteri aşaması Aday → Aktif → Teklif → Kazanıldı boyunca otomatik aksiyonlar (form doldurma, e-imza gönderimi, fatura kesimi)." },
        { title: "Koşullu Hatırlatmalar", description: "'Peşinatı olan alıcılar için kredi ön onay hatırlatıcısı', 'Taşınma tarihi yaklaşan kiracı için sözleşme yenileme'." },
        { title: "İş Akışı Görsel Editörü", description: "Drag-and-drop ile kendi otomasyon kurallarınızı tanımlayabilme; teknik bilgi gerektirmez." },
      ]}
      integrations={["Takvim servisi", "İletişim Merkezi (WhatsApp/SMS/E-posta)", "Görevler modülü", "Bildirim merkezi"]}
    />
  );
}
