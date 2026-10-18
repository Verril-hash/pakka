import { LISTING_STATUS } from '../lib/format';
import { Badge } from './ui';

export default function ListingStatusBadge({ status }) {
  const s = LISTING_STATUS[status];
  return <Badge tone={s.tone} dot pulse={status === 'calling'}>{s.label}</Badge>;
}
