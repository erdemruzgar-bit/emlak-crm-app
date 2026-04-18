"use client";

import { Wallet } from "lucide-react";
import { ComingSoonPage } from "@/components/ui/coming-soon";

export default function FinancePage() {
  return (
    <ComingSoonPage
      icon={Wallet}
      title="Finans ve Komisyon Yönetimi"
      subtitle="Komisyon havuzu, danışman primi, tahsilat, faturalar"
      eta="Faz 2"
      description="Satış ve kira işlemlerinden elde edilen komisyonların takibi, ofis ile danışman arasındaki pay dağılımı, tahsilat süreçleri ve faturalandırma. Ofis sahibinin en çok ihtiyaç duyduğu rapor: 'Bu ay kim ne kadar kazandırdı, ne kadar hakediş var?'"
      plannedFeatures={[
        { title: "Komisyon Havuzu", description: "Her satış/kira işleminde komisyon tutarı, ofis payı, danışman payı ve referans payı otomatik hesaplanır. Tarih bazlı filtre." },
        { title: "Danışman Performansı", description: "Her danışmanın aylık/yıllık cirosu, kapanan işlem sayısı, ortalama komisyon. Liderlik tablosu." },
        { title: "Tahsilat Takibi", description: "Müşteriden alınacak komisyonlar vadelere göre listelenir; gecikmiş tahsilatlar kırmızı uyarıyla görünür." },
        { title: "Ödeme Planları", description: "Taksitli komisyonlar için otomatik plan; hatırlatma, yapılan ödemelerin kaydı." },
        { title: "Fatura / Makbuz", description: "Komisyon faturaları, taraf bilgileriyle otomatik kesilir. PDF olarak arşivlenir, müşteriye gönderilir." },
        { title: "Gider Takibi", description: "İlan yayın ücreti, araç yakıt, ofis giderleri. Net kâr için gider çıkarması yapılır." },
        { title: "Kapsamlı Mali Rapor", description: "Aylık gelir-gider, danışman bazlı hakediş bordrosu, şubeye göre kıyaslama." },
      ]}
      integrations={["Muhasebe yazılımları (Logo, Mikro, Luca, Parasut)", "e-Arşiv / e-Fatura portalı", "Banka hesap ekstresi (Open Banking)"]}
    />
  );
}
