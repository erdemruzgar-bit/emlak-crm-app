"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Loader2, User, Phone, Mail, Filter } from "lucide-react";
import { HelpButton } from "@/components/ui/help-button";

interface CustomerRow {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  customerType: string;
  stage: string | null;
  urgency: string | null;
  assignedAgent: { id: string; name: string } | null;
  branch: { id: string; name: string } | null;
  interestedProjects: { createdAt: string; note: string | null; addedBy: { name: string } | null }[];
}

export default function ProjectCustomersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [project, setProject] = useState<{ name: string; code?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/projects/${id}/customers?limit=100`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setCustomers(data.customers || []);
          setTotal(data.pagination?.total || 0);
          setProject(data.project || null);
        }
      })
      .catch(() => {
        setCustomers([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest">
              Bu projeyle ilgilenen müşteriler
            </h2>
            <HelpButton page="projects-customers" title="İlgili Müşteriler" />
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            {project?.name}
            {project?.code ? <span className="opacity-70"> ({project.code})</span> : null}
            <span className="mx-2 opacity-30">·</span>
            {total} müşteri
          </p>
        </div>
        <Link
          href={`/customers?interestedProjectId=${id}`}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold bg-surface-container-low hover:bg-surface-container rounded-xl"
        >
          <Filter className="w-3.5 h-3.5" />
          Müşteri listesinde aç
        </Link>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : customers.length === 0 ? (
        <div className="py-16 bg-surface-container-lowest rounded-3xl text-center border border-outline-variant/10">
          <User className="w-10 h-10 text-on-surface-variant/50 mx-auto mb-3" />
          <p className="text-sm font-bold text-on-surface">Henüz ilgilenen müşteri yok</p>
          <p className="text-xs text-on-surface-variant mt-2">
            Müşteri kartlarındaki &quot;İlgilendiği Projeler&quot; alanına bu projeyi ekleyen müşteriler burada listelenir.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden bg-surface-container-lowest rounded-3xl border border-outline-variant/10">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low text-xs font-bold text-on-surface-variant uppercase tracking-widest">
              <tr>
                <th className="text-left px-5 py-3">Müşteri</th>
                <th className="text-left px-5 py-3">İletişim</th>
                <th className="text-left px-5 py-3">Aşama</th>
                <th className="text-left px-5 py-3">Danışman</th>
                <th className="text-left px-5 py-3">Şube</th>
                <th className="text-left px-5 py-3">Eklendi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {customers.map((c) => {
                const entry = c.interestedProjects[0];
                return (
                  <tr key={c.id} className="hover:bg-surface-container-low/40">
                    <td className="px-5 py-3">
                      <Link href={`/customers/${c.id}`} className="font-bold text-primary hover:underline">
                        {c.firstName} {c.lastName}
                      </Link>
                      <p className="text-xs text-on-surface-variant">{c.customerType}</p>
                    </td>
                    <td className="px-5 py-3 text-xs text-on-surface-variant">
                      {c.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</div>}
                      {c.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</div>}
                      {!c.phone && !c.email && <span className="opacity-50">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-bold">{c.stage || "—"}</span>
                      {c.urgency && <p className="text-[10px] text-on-surface-variant uppercase">{c.urgency}</p>}
                    </td>
                    <td className="px-5 py-3 text-xs">{c.assignedAgent?.name || "—"}</td>
                    <td className="px-5 py-3 text-xs">{c.branch?.name || "—"}</td>
                    <td className="px-5 py-3 text-xs text-on-surface-variant">
                      {entry?.createdAt ? new Date(entry.createdAt).toLocaleDateString("tr-TR") : "—"}
                      {entry?.addedBy?.name && <p className="opacity-70">{entry.addedBy.name}</p>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
