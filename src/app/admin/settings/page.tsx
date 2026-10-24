import { adminOrNull } from '@/lib/auth';
import { getSettings } from '@/lib/catalog';
import { BODY_FONTS, DISPLAY_FONTS, PRESETS } from '@/lib/settings';
import { saveRules, saveStore } from '../actions';

export default async function SettingsPage() {
  if (!(await adminOrNull())) return null;
  const s = await getSettings();
  return <>
    <div><div className="kicker">Admin</div><h2 style={{ fontSize: '2rem' }}>Design & settings</h2></div>
    <form className="panel" action={saveStore}>
      <h3>Store</h3>
      <div className="two"><div className="field"><label>Store name</label><input name="name" defaultValue={s.store.name} /></div><div className="field"><label>Monogram</label><input name="mono" maxLength={3} defaultValue={s.store.mono} /></div></div>
      <div className="field"><label>Announcement bar</label><input name="announce" defaultValue={s.store.announce} /></div>
      <div className="field"><label>Tagline (footer and search engines)</label><input name="tagline" defaultValue={s.store.tagline} /></div>
      <h3>Look</h3>
      <div className="swrow">{Object.entries(PRESETS).map(([k, p]) => <label key={k} className="preset"><input type="radio" name="preset" value={k} defaultChecked={s.theme.preset === k} /><i style={{ background: p.swatch }} />{p.label}</label>)}</div>
      <div className="two"><div className="field"><label>Heading font</label><select name="font" defaultValue={s.theme.font}>{Object.keys(DISPLAY_FONTS).map(f => <option key={f}>{f}</option>)}</select></div>
        <div className="field"><label>Text font</label><select name="body" defaultValue={s.theme.body}>{Object.keys(BODY_FONTS).map(f => <option key={f}>{f}</option>)}</select></div></div>
      <div className="two"><div className="field"><label>Accent colour</label><input type="color" name="accent" defaultValue={s.theme.accent || '#9a7a45'} /><label style={{ fontSize: '.8rem' }}><input type="checkbox" name="accentOn" defaultChecked={!!s.theme.accent} /> Use this colour</label></div>
        <div className="field"><label>Corner roundness (px)</label><input type="number" name="radius" min="0" max="20" defaultValue={s.theme.radius} /></div></div>
      <div><button className="btn">Save design</button></div>
    </form>
    <form className="panel" action={saveRules}>
      <h3>Rewards, currency and reviews</h3>
      <div className="two"><div className="field"><label>Purchase reward (% back as store credit)</label><input type="number" name="rewardRate" min="0" max="5" step="0.05" defaultValue={s.rewardRate} /></div><div className="field"><label>Pop-up ad delay (seconds)</label><input type="number" name="popupDelay" min="0" max="60" defaultValue={s.popupDelay} /></div></div>
      <p className="muted" style={{ fontSize: '.88rem' }}>Customers see only the credit amount, never the percentage. Set 0 to switch rewards off.</p>
      <div className="two"><div className="field"><label>1 USD in MYR</label><input type="number" name="MYR" step="0.01" defaultValue={s.rates.MYR} /></div><div className="field"><label>1 USD in BDT</label><input type="number" name="BDT" step="0.01" defaultValue={s.rates.BDT} /></div></div>
      <label className="toggle"><span>Hold new reviews until approved</span><input type="checkbox" name="holdReviews" defaultChecked={s.holdReviews} /></label>
      <label className="toggle"><span>Allow video in reviews</span><input type="checkbox" name="allowVideoReviews" defaultChecked={s.allowVideoReviews} /></label>
      <div><button className="btn">Save settings</button></div>
    </form>
  </>;
}
