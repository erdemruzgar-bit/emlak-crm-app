"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Upload,
  Trash2,
  CheckCircle,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

interface UIRow {
  id: string;
  parsel: string;
  blockName: string;
  unitNumber: string;
  area: string;          // string for editable input — parsed on commit
  zeminKatBrut: string;
  asmaKatBrut: string;
  dukkanOnAlani: string;
  floor: string;
  viewType: string;
  fiyat: string;         // PDF'teki TL (zaten +%20 yansımış)
  aylikKira: string;     // aylık ≈ fiyat/180
  groupLabel: string;
}

const blankRow = (id: string): UIRow => ({
  id,
  parsel: "",
  blockName: "",
  unitNumber: "",
  area: "",
  zeminKatBrut: "",
  asmaKatBrut: "",
  dukkanOnAlani: "",
  floor: "",
  viewType: "",
  fiyat: "",
  aylikKira: "",
  groupLabel: "",
});

function parseTr(value: string): number | null {
  if (!value) return null;
  // "1.234.567,89" → 1234567.89; "1234567.89" → 1234567.89
  const cleaned = value.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

export default function PdfImportPage() {
  const router = useRouter();

  // Proje meta
  const [projectName, setProjectName] = useState("Meydan Başakşehir");
  const [projectCode, setProjectCode] = useState("MEYDAN");
  const [projectCity, setProjectCity] = useState("İstanbul");
  const [projectDistrict, setProjectDistrict] = useState("Başakşehir");
  const [projectDeveloper, setProjectDeveloper] = useState("");
  const [projectDescription, setProjectDescription] = useState(
    "Kiralık dükkanlar — 180 ay vadeli (15 yıl) kira sözleşmesi modeli. Fiyatlar liste × %20 yansıtılmış olarak gelir; aylık kira ≈ fiyat / 180."
  );

  // Satırlar
  const [rows, setRows] = useState<UIRow[]>([blankRow(crypto.randomUUID())]);

  // Vaziyet planı URL listesi
  const [sitePlanUrls, setSitePlanUrls] = useState<string[]>([]);
  const [uploadingPlan, setUploadingPlan] = useState(false);

  // Loading
  const [committing, setCommitting] = useState(false);
  const [importedResult, setImportedResult] = useState<{
    createdProperties: number;
    createdBlocks: number;
    skippedConflicts: number;
    projectId: string;
  } | null>(null);

  // JSON yapıştırma alanı (extract.ts çıktısı)
  const [jsonRaw, setJsonRaw] = useState("");

  function applyJson() {
    try {
      const parsed = JSON.parse(jsonRaw);
      const rawRows = Array.isArray(parsed) ? parsed : parsed.rows;
      if (!Array.isArray(rawRows)) throw new Error("'rows' dizisi bulunamadı");
      const next: UIRow[] = rawRows.map((r: Record<string, unknown>) => ({
        id: crypto.randomUUID(),
        parsel: String(r.parsel ?? ""),
        blockName: String(r.blockName ?? ""),
        unitNumber: String(r.unitNumber ?? ""),
        area: r.toplamSatisaEsasBrut != null ? String(r.toplamSatisaEsasBrut) : r.area != null ? String(r.area) : "",
        zeminKatBrut: r.zeminKatBrut != null ? String(r.zeminKatBrut) : "",
        asmaKatBrut: r.asmaKatBrut != null ? String(r.asmaKatBrut) : "",
        dukkanOnAlani: r.dukkanOnAlani != null ? String(r.dukkanOnAlani) : "",
        floor: r.floor != null ? String(r.floor) : "",
        viewType: String(r.viewType ?? ""),
        fiyat: r.fiyat != null ? String(r.fiyat) : "",
        aylikKira: r.aylikKira != null ? String(r.aylikKira) : "",
        groupLabel: String(r.groupLabel ?? ""),
      }));
      if (parsed?.project?.name) setProjectName(String(parsed.project.name));
      if (parsed?.project?.code) setProjectCode(String(parsed.project.code));
      if (Array.isArray(parsed?.sitePlanImageUrls)) {
        setSitePlanUrls(parsed.sitePlanImageUrls);
      }
      setRows(next.length ? next : [blankRow(crypto.randomUUID())]);
      toast.success(`${next.length} satır yüklendi`);
    } catch (e) {
      toast.error("JSON parse hatası: " + (e instanceof Error ? e.message : "bilinmiyor"));
    }
  }

  function addRow() {
    setRows((rs) => [...rs, blankRow(crypto.randomUUID())]);
  }
  function removeRow(id: string) {
    setRows((rs) => rs.filter((r) => r.id !== id));
  }
  function updateRow(id: string, field: keyof UIRow, value: string) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  // Auto-fill: kullanıcı fiyat değiştirince aylık kira boşsa /180 olarak doldur
  function onFiyatBlur(id: string) {
    setRows((rs) =>
      rs.map((r) => {
        if (r.id !== id) return r;
        const f = parseTr(r.fiyat);
        if (f && !r.aylikKira) {
          return { ...r, aylikKira: Math.round(f / 180).toString() };
        }
        return r;
      })
    );
  }

  async function uploadPlanFile(file: File) {
    setUploadingPlan(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Yükleme başarısız");
      }
      const data = await res.json();
      if (data.url) {
        setSitePlanUrls((u) => [...u, data.url]);
        toast.success("Vaziyet planı yüklendi");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Yükleme hatası");
    } finally {
      setUploadingPlan(false);
    }
  }

  const validRows = useMemo(
    () => rows.filter((r) => r.blockName.trim() && r.unitNumber.trim() && parseTr(r.fiyat)),
    [rows]
  );

  const totals = useMemo(() => {
    let totalFiyat = 0;
    let totalKira = 0;
    for (const r of validRows) {
      totalFiyat += parseTr(r.fiyat) ?? 0;
      totalKira += parseTr(r.aylikKira) ?? 0;
    }
    return { count: validRows.length, totalFiyat, totalKira };
  }, [validRows]);

  async function handleCommit() {
    if (validRows.length === 0) {
      toast.error("Geçerli satır yok (blok, birim no, fiyat zorunlu)");
      return;
    }
    if (!projectName.trim()) {
      toast.error("Proje adı zorunlu");
      return;
    }
    setCommitting(true);
    try {
      const payload = {
        project: {
          name: projectName.trim(),
          code: projectCode.trim() || undefined,
          description: projectDescription.trim() || undefined,
          city: projectCity.trim() || undefined,
          district: projectDistrict.trim() || undefined,
          developer: projectDeveloper.trim() || undefined,
        },
        autoCreateBlocks: true,
        rows: validRows.map((r) => ({
          parsel: r.parsel.trim() || undefined,
          blockName: r.blockName.trim(),
          unitNumber: r.unitNumber.trim(),
          area: parseTr(r.area),
          zeminKatBrut: parseTr(r.zeminKatBrut),
          asmaKatBrut: parseTr(r.asmaKatBrut),
          dukkanOnAlani: parseTr(r.dukkanOnAlani),
          floor: r.floor.trim() ? parseInt(r.floor) : null,
          viewType: r.viewType.trim() || undefined,
          fiyat: parseTr(r.fiyat) ?? 0,
          aylikKira: parseTr(r.aylikKira),
          groupLabel: r.groupLabel.trim() || undefined,
        })),
        sitePlanImageUrls: sitePlanUrls,
      };
      const res = await fetch("/api/projects/pdf-import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Sunucu hatası");
      }
      setImportedResult({
        createdProperties: data.createdProperties,
        createdBlocks: data.createdBlocks,
        skippedConflicts: data.skippedConflicts,
        projectId: data.projectId,
      });
      toast.success(`${data.createdProperties} dükkan oluşturuldu`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hata");
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/properties"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          İlanlara dön
        </Link>
      </div>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            PDF'ten Toplu Dükkan İçe Aktarımı
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Meydan Başakşehir gibi büyük dükkan listelerini PDF/JSON ile yükleyin.
            Fiyatlar zaten <strong>+%20</strong> yansımış varsayılır; aylık kira ≈ fiyat ÷ 180.
          </p>
        </div>
      </div>

      {importedResult && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
          <div className="flex-1">
            <div className="font-medium text-green-900">İçe aktarma tamamlandı</div>
            <div className="text-sm text-green-800 mt-1">
              {importedResult.createdProperties} dükkan oluşturuldu
              {importedResult.createdBlocks > 0 && ` · ${importedResult.createdBlocks} blok eklendi`}
              {importedResult.skippedConflicts > 0 &&
                ` · ${importedResult.skippedConflicts} satır atlandı (mevcut)`}
            </div>
            <div className="mt-2 flex gap-3">
              <button
                onClick={() => router.push(`/properties?projectId=${importedResult.projectId}`)}
                className="text-sm text-green-700 underline"
              >
                Oluşturulan ilanları gör →
              </button>
              <button
                onClick={() => setImportedResult(null)}
                className="text-sm text-gray-600 underline"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JSON yapıştırma */}
      <details className="rounded-lg border bg-gray-50 p-4">
        <summary className="cursor-pointer text-sm font-medium">
          JSON yapıştır (extract.ts çıktısı)
        </summary>
        <div className="mt-3 space-y-2">
          <textarea
            value={jsonRaw}
            onChange={(e) => setJsonRaw(e.target.value)}
            placeholder='{"project": {...}, "rows": [...]}'
            rows={6}
            className="w-full text-xs font-mono rounded border p-2"
          />
          <button
            onClick={applyJson}
            disabled={!jsonRaw.trim()}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            Uygula
          </button>
          <p className="text-xs text-gray-600">
            <code className="bg-white px-1 rounded">
              npx tsx scripts/pdf-import/extract.ts /path/to/file.pdf
            </code>{" "}
            çıktısını yapıştırın.
          </p>
        </div>
      </details>

      {/* Proje formu */}
      <div className="rounded-lg border bg-white p-4 space-y-3">
        <h2 className="font-semibold">Proje bilgileri</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Proje adı *">
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full rounded border px-2 py-1.5 text-sm"
            />
          </Field>
          <Field label="Kısa kod">
            <input
              value={projectCode}
              onChange={(e) => setProjectCode(e.target.value)}
              className="w-full rounded border px-2 py-1.5 text-sm"
            />
          </Field>
          <Field label="Müteahhit">
            <input
              value={projectDeveloper}
              onChange={(e) => setProjectDeveloper(e.target.value)}
              className="w-full rounded border px-2 py-1.5 text-sm"
            />
          </Field>
          <Field label="Şehir">
            <input
              value={projectCity}
              onChange={(e) => setProjectCity(e.target.value)}
              className="w-full rounded border px-2 py-1.5 text-sm"
            />
          </Field>
          <Field label="İlçe">
            <input
              value={projectDistrict}
              onChange={(e) => setProjectDistrict(e.target.value)}
              className="w-full rounded border px-2 py-1.5 text-sm"
            />
          </Field>
        </div>
        <Field label="Açıklama">
          <textarea
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            rows={2}
            className="w-full rounded border px-2 py-1.5 text-sm"
          />
        </Field>
      </div>

      {/* Vaziyet planı yükleme */}
      <div className="rounded-lg border bg-white p-4 space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          Vaziyet planı görselleri
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          {sitePlanUrls.map((u, i) => (
            <div key={i} className="relative group">
              { }
              <img
                src={u}
                alt={`Plan ${i + 1}`}
                className="h-24 w-32 object-cover rounded border"
              />
              <button
                onClick={() => setSitePlanUrls((urls) => urls.filter((_, idx) => idx !== i))}
                className="absolute top-1 right-1 rounded-full bg-red-600 text-white p-1 opacity-0 group-hover:opacity-100 transition"
                aria-label="Kaldır"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          <label className="h-24 w-32 rounded border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-gray-50 text-sm text-gray-600">
            {uploadingPlan ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Upload className="h-4 w-4 mr-1" />
                Yükle
              </>
            )}
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadPlanFile(f);
                e.currentTarget.value = "";
              }}
              disabled={uploadingPlan}
            />
          </label>
        </div>
      </div>

      {/* Satırlar */}
      <div className="rounded-lg border bg-white">
        <div className="p-4 border-b flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-semibold">Dükkan satırları</h2>
            <p className="text-xs text-gray-600 mt-0.5">
              {validRows.length} geçerli satır · Toplam fiyat: ₺
              {totals.totalFiyat.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} · Toplam aylık kira: ₺
              {totals.totalKira.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}
            </p>
          </div>
          <button
            onClick={addRow}
            className="rounded bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200 inline-flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Satır ekle
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b text-gray-700">
              <tr>
                <th className="p-2 text-left font-medium">Parsel</th>
                <th className="p-2 text-left font-medium">Blok *</th>
                <th className="p-2 text-left font-medium">Birim *</th>
                <th className="p-2 text-right font-medium">Zemin m²</th>
                <th className="p-2 text-right font-medium">Asma m²</th>
                <th className="p-2 text-right font-medium">Toplam m² (area)</th>
                <th className="p-2 text-right font-medium">Dükkan önü m²</th>
                <th className="p-2 text-right font-medium">Kat</th>
                <th className="p-2 text-left font-medium">Manzara</th>
                <th className="p-2 text-right font-medium">Fiyat ₺ *</th>
                <th className="p-2 text-right font-medium">Aylık kira ₺</th>
                <th className="p-2 text-left font-medium">Grup</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="p-1">
                    <input
                      value={r.parsel}
                      onChange={(e) => updateRow(r.id, "parsel", e.target.value)}
                      className="w-16 rounded border px-1 py-0.5"
                      placeholder="2124"
                    />
                  </td>
                  <td className="p-1">
                    <input
                      value={r.blockName}
                      onChange={(e) => updateRow(r.id, "blockName", e.target.value)}
                      className="w-16 rounded border px-1 py-0.5"
                      placeholder="A1"
                    />
                  </td>
                  <td className="p-1">
                    <input
                      value={r.unitNumber}
                      onChange={(e) => updateRow(r.id, "unitNumber", e.target.value)}
                      className="w-14 rounded border px-1 py-0.5"
                      placeholder="23"
                    />
                  </td>
                  <td className="p-1">
                    <input
                      value={r.zeminKatBrut}
                      onChange={(e) => updateRow(r.id, "zeminKatBrut", e.target.value)}
                      className="w-20 rounded border px-1 py-0.5 text-right"
                    />
                  </td>
                  <td className="p-1">
                    <input
                      value={r.asmaKatBrut}
                      onChange={(e) => updateRow(r.id, "asmaKatBrut", e.target.value)}
                      className="w-20 rounded border px-1 py-0.5 text-right"
                    />
                  </td>
                  <td className="p-1">
                    <input
                      value={r.area}
                      onChange={(e) => updateRow(r.id, "area", e.target.value)}
                      className="w-24 rounded border px-1 py-0.5 text-right"
                    />
                  </td>
                  <td className="p-1">
                    <input
                      value={r.dukkanOnAlani}
                      onChange={(e) => updateRow(r.id, "dukkanOnAlani", e.target.value)}
                      className="w-20 rounded border px-1 py-0.5 text-right"
                    />
                  </td>
                  <td className="p-1">
                    <input
                      value={r.floor}
                      onChange={(e) => updateRow(r.id, "floor", e.target.value)}
                      className="w-12 rounded border px-1 py-0.5 text-right"
                    />
                  </td>
                  <td className="p-1">
                    <input
                      value={r.viewType}
                      onChange={(e) => updateRow(r.id, "viewType", e.target.value)}
                      className="w-24 rounded border px-1 py-0.5"
                    />
                  </td>
                  <td className="p-1">
                    <input
                      value={r.fiyat}
                      onChange={(e) => updateRow(r.id, "fiyat", e.target.value)}
                      onBlur={() => onFiyatBlur(r.id)}
                      className="w-32 rounded border px-1 py-0.5 text-right"
                      placeholder="106076640"
                    />
                  </td>
                  <td className="p-1">
                    <input
                      value={r.aylikKira}
                      onChange={(e) => updateRow(r.id, "aylikKira", e.target.value)}
                      className="w-28 rounded border px-1 py-0.5 text-right text-gray-500"
                    />
                  </td>
                  <td className="p-1">
                    <input
                      value={r.groupLabel}
                      onChange={(e) => updateRow(r.id, "groupLabel", e.target.value)}
                      className="w-24 rounded border px-1 py-0.5"
                    />
                  </td>
                  <td className="p-1">
                    <button
                      onClick={() => removeRow(r.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                      aria-label="Sil"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bilgilendirme + commit */}
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
        <div className="text-sm text-amber-900 space-y-1">
          <div>
            <strong>Fiyat alanı</strong> doğrudan{" "}
            <code className="bg-amber-100 px-1 rounded">price</code> kolonuna yazılır. PDF'te liste fiyatı zaten
            +%20 ile yansımış varsayılır.
          </div>
          <div>
            <strong>Aylık kira</strong>, <code className="bg-amber-100 px-1 rounded">operationalNote</code>{" "}
            içine yazılır (price ≠ aylık kira). Boş bırakırsanız fiyat ÷ 180 olarak otomatik hesaplanır.
          </div>
          <div>
            Aynı (proje, blok, birim_no) zaten varsa <strong>atlanır</strong>; mevcut kayıt üzerine yazılmaz.
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleCommit}
          disabled={committing || validRows.length === 0}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
        >
          {committing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {validRows.length} dükkanı içe aktar
        </button>
        <Link href="/properties" className="text-sm text-gray-600 hover:text-gray-900">
          İptal
        </Link>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-700 mb-1 block">{label}</span>
      {children}
    </label>
  );
}
