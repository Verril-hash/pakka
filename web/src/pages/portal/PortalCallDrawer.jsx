import { Drawer, LangBadge, Skeleton, Transcript } from '../../components/ui';
import { useApi } from '../../lib/api';
import { dateTime, duration } from '../../lib/format';

/** A single call with Pakka: recording + transcript. Only ever the signed-in person's own call. */
export default function PortalCallDrawer({ id, onClose, you = 'You' }) {
  const { data: c, loading } = useApi(id ? `/api/portal/calls/${id}` : null);
  return (
    <Drawer
      open={Boolean(id)}
      onClose={onClose}
      title="Your call with Pakka"
      subtitle={c && <span className="flex flex-wrap items-center gap-2">{dateTime(c.at)} · {duration(c.durationSec)} <LangBadge code={c.language} /></span>}
    >
      {loading || !c ? (
        <div className="space-y-3 p-6">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : (
        <div className="p-5 sm:p-7">
          {c.hasRecording && (
            <div className="mb-6 rounded-2xl bg-canvas p-3">
              <p className="mb-2 px-1 text-[12px] font-medium text-ink-500">Recording</p>
              <audio controls preload="none" className="h-9 w-full" src={`/api/portal/calls/${c.id}/recording`} />
            </div>
          )}
          <Transcript text={c.transcript} agentLabel="Pakka" userLabel={you} />
          <p className="mt-6 text-[12px] leading-relaxed text-ink-400">Pakka's assistant is an AI. Calls are recorded so the details on your listing stay accurate.</p>
        </div>
      )}
    </Drawer>
  );
}
