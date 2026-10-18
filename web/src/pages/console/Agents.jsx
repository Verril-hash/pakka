import { AudioLines, Bot, Brain, Clock3, Ear, Wrench } from 'lucide-react';
import { Badge, Card, ErrorNote, LangBadge, PageHeader, Skeleton } from '../../components/ui';
import { useApi } from '../../lib/api';
import { ago, cents, duration } from '../../lib/format';

export default function Agents() {
  const { data, error, loading } = useApi('/api/agents');

  return (
    <>
      <PageHeader title="Agents" description="Pakka's two voice agents, running on Bolna. Read live from the Bolna API." />
      <ErrorNote error={error} />
      <div className="grid gap-6 xl:grid-cols-2">
        {loading && !data ? [...Array(2)].map((_, i) => <Skeleton key={i} className="h-96" />) : data?.agents.map((a) => (
          <Card key={a.key} bodyClass="p-0">
            <div className="flex items-start justify-between gap-4 border-b border-black/[.06] p-5">
              <div className="flex items-center gap-3">
                <span className={`grid h-11 w-11 place-items-center rounded-xl ${a.key === 'check' ? 'bg-brand-50 text-brand-600' : 'bg-violet-50 text-violet-600'}`}><Bot size={22} /></span>
                <div>
                  <p className="text-base font-semibold text-ink-900">{a.name}</p>
                  <p className="text-sm text-ink-500">{a.role}</p>
                </div>
              </div>
              <Badge tone="green" dot>Deployed</Badge>
            </div>
            <div className="grid grid-cols-3 divide-x divide-black/[.06] border-b border-black/[.06]">
              <div className="p-4"><p className="text-xs text-ink-500">Calls</p><p className="tnum mt-1 text-lg font-semibold">{a.calls}</p></div>
              <div className="p-4"><p className="text-xs text-ink-500">Avg length</p><p className="tnum mt-1 text-lg font-semibold">{duration(a.avgSec)}</p></div>
              <div className="p-4"><p className="text-xs text-ink-500">Spend</p><p className="tnum mt-1 text-lg font-semibold">{cents(a.costCents)}</p></div>
            </div>
            <dl className="divide-y divide-black/[.06] px-5">
              <Row icon={Brain} label="Language model">{a.model} · reasoning off</Row>
              <Row icon={Ear} label="Speech recognition">{a.transcriber} · ends turns on meaning, not silence</Row>
              <Row icon={AudioLines} label="Voices">
                <div className="flex flex-col items-end gap-1.5">
                  {a.languages.map((l) => (
                    <span key={l.code} className="flex items-center gap-2"><LangBadge code={l.code} native={false} /><span className="text-ink-500">{l.voice}</span><span className="text-xs text-ink-400">{l.tts}</span></span>
                  ))}
                </div>
              </Row>
              {a.tools.length > 0 && <Row icon={Wrench} label="Mid-call functions"><div className="flex flex-wrap justify-end gap-1.5">{a.tools.map((t) => <code key={t} className="rounded bg-black/[.05] px-1.5 py-0.5 text-xs text-ink-700">{t}</code>)}</div></Row>}
              {a.extractions > 0 && <Row icon={Wrench} label="Post-call extraction">{a.extractions} fields per call</Row>}
              <Row icon={Clock3} label="Max call length">{duration(a.maxCallSec)}</Row>
            </dl>
            <p className="border-t border-black/[.06] px-5 py-3 text-xs text-ink-400">Agent {a.id.slice(0, 8)} · updated {ago(a.updatedAt)} · Bolna</p>
          </Card>
        ))}
      </div>
    </>
  );
}

function Row({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start justify-between gap-6 py-3.5 text-sm">
      <dt className="flex items-center gap-2 text-ink-500"><Icon size={15} className="text-ink-400" />{label}</dt>
      <dd className="text-right font-medium text-ink-900">{children}</dd>
    </div>
  );
}
