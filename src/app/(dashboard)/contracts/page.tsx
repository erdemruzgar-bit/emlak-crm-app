"use client";

import { FileSignature } from "lucide-react";
import { ComingSoonPage } from "@/components/ui/coming-soon";

export default function ContractsPage() {
  return (
    <ComingSoonPage
      icon={FileSignature}
      title="Sözleşme ve Belge Yönetimi"
      subtitle="Kira ve satış sözleşmeleri, tapu arşivi, e-imza"
      eta="Faz 2"
      description="Kira sözleşmeleri, satış sözleşmeleri ve ilgili belgelerin (tapu, ruhsat, iskan) merkezi yönetimi. Hazır şablonlardan müşteri ve ilan bilgisiyle otomatik PDF üretilir; imzaya gönderilir; tüm süreç denetim kaydı altında tutulur."
      plannedFeatures={[
        { title: "Hazır Sözleşme Şablonları", description: "Kira sözleşmesi, satış vaat sözleşmesi, komisyon sözleşmesi. Boşluklar müşteri + ilan verisinden otomatik doldurulur." },
        { title: "PDF Üretme & Önizleme", description: "Tek tıkla tam formatlı PDF. İndirme, müşteriye e-posta, WhatsApp ile paylaşma seçenekleri." },
        { title: "E-imza Kuyruğu", description: "Sözleşme e-imzaya gönderilir; müşteri ve danışmanın imza durumu canlı takip edilir. KEP / e-Devlet uyumlu." },
        { title: "İlan Dokümanları", description: "Tapu, iskân, otopark tahsis belgesi, proje dosyaları — her ilan altında düzenli klasör." },
        { title: "Sözleşme Geçmişi", description: "Aktif / tamamlandı / iptal sözleşmeler, tarihlere göre filtreleme. Müşteri başına tüm sözleşmeler tek ekranda." },
        { title: "Otomatik Hatırlatma", description: "Kira yenileme tarihi yaklaşan sözleşmeler için bildirim ve görev oluşturma." },
      ]}
      integrations={["DocuSign / KolayImza / e-İmzaTR", "KEP (Kayıtlı Elektronik Posta)", "PDF şablon motoru", "Dosya depolama (S3 / yerel)"]}
    />
  );
}
