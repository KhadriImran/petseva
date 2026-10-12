import { useLiveQuery } from 'dexie-react-hooks';
import { Download, Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ReceiptModal } from '../components/ReceiptModal';
import { Button, Input } from '../components/ui';
import { api } from '../lib/api';
import { cache } from '../lib/db';
import { cn, inr } from '../lib/format';
import { useSync } from '../lib/sync';

/** YYYY-MM-DD in India time, `daysAgo` days back */
const ymd = (daysAgo = 0) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(Date.now() - daysAgo * 86_400_000));
const monthStart = () => ymd().slice(0, 8) + '01';
const rs = (p: number) => (p / 100).toFixed(2);

export default function Reports() {
  const online = useSync((s) => s.online);
  const outlet = useLiveQuery(() => cache.outlet(), []);
  const [range, setRange] = useState({ from: ymd(), to: ymd() });
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState('');
  const [printText, setPrintText] = useState<string | null>(null);
  const isToday = range.from === ymd() && range.to === ymd();

  useEffect(() => {
    const load = () =>
      api('GET', `/reports/summary?from=${range.from}&to=${range.to}`)
        .then((d) => {
          setData(d);
          setErr('');
        })
        .catch((e) => setErr(e.message));
    void load();
    if (!isToday) return;
    const t = setInterval(load, 30000); // live refresh only for today
    return () => clearInterval(t);
  }, [online, range.from, range.to]);

  const label = range.from === range.to ? range.from.split('-').reverse().join('/') : `${range.from.split('-').reverse().join('/')} – ${range.to.split('-').reverse().join('/')}`;

  /** 42-column text for the 80 mm thermal printer */
  const dayEndText = () => {
    const W = 42;
    const row = (a: string, b: string) => a.slice(0, W - b.length - 1).padEnd(W - b.length) + b;
    const center = (t: string) => t.padStart(Math.floor((W + t.length) / 2)).padEnd(W);
    const rule = '-'.repeat(W);
    const lines = [
      center(outlet?.name ?? ''),
      center('SALES REPORT'),
      center(label),
      rule,
      row('Total sales', rs(data.sales)),
      row('Bills', String(data.billCount)),
      row('Average bill', rs(data.avgOrderValue)),
      row('GST', rs(data.tax)),
      row('Discounts', rs(data.discount)),
      row('Cancelled orders', String(data.cancelledOrders)),
      rule,
      'PAYMENTS',
      ...data.byMode.map((m: any) => row('  ' + m.mode, rs(m.amount))),
      rule,
      'CATEGORIES',
      ...data.byCategory.map((c: any) => row(`  ${c.name} (${c.qty})`, rs(c.amount))),
      rule,
      'ITEMS',
      ...data.topItems.map((t: any) => row(`  ${t.qty} x ${t.name}`, rs(t.amount))),
      rule,
      `Printed ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
    ];
    return lines.join('\n');
  };

  const downloadCsv = () => {
    const q = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    const rows = [
      ['Report', `Sales ${label}`],
      ['Total sales', rs(data.sales)],
      ['Bills', data.billCount],
      ['GST', rs(data.tax)],
      ['Discounts', rs(data.discount)],
      [],
      ['Payment mode', 'Amount'],
      ...data.byMode.map((m: any) => [m.mode, rs(m.amount)]),
      [],
      ['Category', 'Qty', 'Amount'],
      ...data.byCategory.map((c: any) => [c.name, c.qty, rs(c.amount)]),
      [],
      ['Item', 'Qty', 'Amount'],
      ...data.topItems.map((t: any) => [t.name, t.qty, rs(t.amount)]),
    ];
    const csv = rows.map((r) => r.map((c: any) => q(c)).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
    a.download = `sales_${range.from}_to_${range.to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const quick: [string, { from: string; to: string }][] = [
    ['Today', { from: ymd(), to: ymd() }],
    ['Yesterday', { from: ymd(1), to: ymd(1) }],
    ['Last 7 days', { from: ymd(6), to: ymd() }],
    ['This month', { from: monthStart(), to: ymd() }],
  ];

  const Stat = ({ label, value }: { label: string; value: string }) => (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="text-xs uppercase text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );

  return (
    <div className="scroll-thin h-full overflow-y-auto p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h1 className="mr-2 text-lg font-semibold">Sales</h1>
        {quick.map(([name, r]) => (
          <button
            key={name}
            onClick={() => setRange(r)}
            className={cn('rounded-lg px-3 py-1.5 text-sm', range.from === r.from && range.to === r.to ? 'bg-brand-500 font-semibold text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')}
          >
            {name}
          </button>
        ))}
        <div className="flex items-center gap-1 text-sm text-slate-400">
          <Input type="date" value={range.from} max={range.to} onChange={(e) => e.target.value && setRange({ ...range, from: e.target.value })} className="w-36 sm:w-40" />
          to
          <Input type="date" value={range.to} min={range.from} max={ymd()} onChange={(e) => e.target.value && setRange({ ...range, to: e.target.value })} className="w-36 sm:w-40" />
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" onClick={() => setPrintText(dayEndText())} disabled={!data}>
            <Printer size={14} /> Print summary
          </Button>
          <Button size="sm" onClick={downloadCsv} disabled={!data}>
            <Download size={14} /> Excel / CSV
          </Button>
        </div>
      </div>

      {err && !data && <div className="p-6 text-slate-400">Reports need an internet connection. ({err})</div>}
      {!data && !err && <div className="p-6 text-slate-400">Loading…</div>}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Sales" value={inr(data.sales)} />
            <Stat label="Bills" value={String(data.billCount)} />
            <Stat label="Avg bill" value={inr(data.avgOrderValue)} />
            <Stat label="GST collected" value={inr(data.tax)} />
            <Stat label="Discounts" value={inr(data.discount)} />
            <Stat label="Cancelled orders" value={String(data.cancelledOrders)} />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Panel title="By payment mode" rows={data.byMode.map((m: any) => [m.mode, inr(m.amount)])} />
            <Panel title="By order type" rows={data.byType.map((t: any) => [`${t.type.replace('_', '-')} (${t.count})`, inr(t.amount)])} />
            <Panel title="By category" rows={data.byCategory.map((c: any) => [`${c.name} × ${c.qty}`, inr(c.amount)])} />
          </div>
          <div className="mt-3">
            <Panel title={`Items sold (${data.topItems.length})`} rows={data.topItems.map((t: any) => [`${t.name} × ${t.qty}`, inr(t.amount)])} />
          </div>
        </>
      )}
      <ReceiptModal text={printText} title="Sales summary" onClose={() => setPrintText(null)} />
    </div>
  );
}

function Panel({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 px-4 py-2 text-sm font-semibold">{title}</div>
      <div className="p-2 text-sm">
        {rows.length === 0 && <div className="p-2 text-slate-500">—</div>}
        {rows.map(([a, b], i) => (
          <div key={i} className="flex justify-between px-2 py-1">
            <span className="text-slate-300">{a}</span>
            <span>{b}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
