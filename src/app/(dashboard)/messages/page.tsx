"use client";

import { MessageSquare } from "lucide-react";
import { ComingSoonPage } from "@/components/ui/coming-soon";

export default function MessagesPage() {
  return (
    <ComingSoonPage
      icon={MessageSquare}
      title="İletişim Merkezi"
      subtitle="WhatsApp, SMS ve e-posta tek gelen kutusunda"
      eta="Faz 2"
      description="Müşteriyle yapılan tüm yazışmalar — WhatsApp mesajları, SMS'ler, e-postalar — tek bir gelen kutusunda toplanır. Her konuşma müşteri kartına otomatik bağlanır; hangi ilan üzerine konuşulduğunu kaybetmezsiniz. Danışmanın yanıt süresi ve dönüşüm oranı raporlanabilir."
      plannedFeatures={[
        { title: "Tek Gelen Kutusu", description: "WhatsApp, SMS, e-posta ve site formları aynı ekranda. Müşteri seçildiğinde tüm geçmiş görünür." },
        { title: "Hazır Yanıt Şablonları", description: "Sık kullanılan yanıtlar (ilan bilgisi, randevu teyidi) tek tıkla gönderilir. Değişkenler (müşteri adı, ilan başlığı) otomatik doldurulur." },
        { title: "Toplu SMS/E-posta Kampanyası", description: "Segmentli müşteri listesine (VIP, Kadıköy bölgesi, vs.) toplu bilgilendirme gönderir. Açılma/tıklama istatistikleri." },
        { title: "Yanıt Süresi Göstergesi", description: "Her gelen mesaja ne kadar sürede yanıt verildiğini kaydeder. Danışman KPI'larına dahil olur." },
        { title: "Okunmamış Uyarıları", description: "Sidebar'da ve bildirim merkezinde okunmamış mesaj sayısı canlı gösterilir. Sessize alma / yıldızlama." },
        { title: "Otomatik Müşteri Eşleştirme", description: "Gelen numara/e-posta veritabanında varsa müşteri otomatik bulunur; yoksa hızlı kayıt açma." },
      ]}
      integrations={["WhatsApp Business API (Meta)", "SMS sağlayıcı (Netgsm / Iletimerkezi)", "SMTP / Gmail", "Web form webhook"]}
    />
  );
}
