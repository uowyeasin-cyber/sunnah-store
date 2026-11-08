import { adminOrNull } from '@/lib/auth';
import ScheduleBox from '../ScheduleBox';

export default async function Reminders() {
  if (!(await adminOrNull('reminders'))) return null;
  return <>
    <div className="page-head"><div><h2>Reminders & schedule</h2><p>Tell the AI in your own words, in any language, or fill the form. A reminder is emailed to you at its time and stays on the Dashboard until you tick it. A job (hide or show a product, start or stop an offer, book a courier, any AI co-worker task) runs by itself at its time.</p></div></div>
    <ScheduleBox full />
  </>;
}
