import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowUpRight, Download, RefreshCw, ShieldCheck, LogOut } from 'lucide-react'
import { api, ApiError } from './api'
import type { UsageDashboard, UsageDimension, UsageDay } from './usageMetrics'
import { dailyCSV, metricLabels, weeklyComparison, type TrafficMetric } from './metricsInsights'
import './metrics.css'

type Section = 'overview' | 'audience' | 'sources' | 'activity'
const number = (value: number) => value.toLocaleString()
const dateLabel = (value: string) => new Date(`${value}T12:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })

export function MetricsPage({ token, logout }: { token: string; logout: () => void }) {
  const [days, setDays] = useState(() => { const n = Number(new URLSearchParams(location.search).get('days')); return [7,30,90].includes(n) ? n : 30 })
  const [section, setSection] = useState<Section>('overview')
  const [metric, setMetric] = useState<TrafficMetric>('pageViews')
  const [data, setData] = useState<UsageDashboard | null>(null)
  const [error, setError] = useState('')
  const [restricted, setRestricted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const [updated, setUpdated] = useState<Date | null>(null)
  useEffect(() => { document.title = 'Analytics | Hushful' }, [])
  useEffect(() => {
    let active = true
    setLoading(true); setError(''); setRestricted(false); setData(null)
    api.usageMetrics(token, days).then(result => { if (active) { setData(result); setUpdated(new Date()) } }).catch(e => { if (active) { setRestricted(e instanceof ApiError && [401,403].includes(e.status)); setError(e instanceof Error ? e.message : 'Could not load metrics.') } }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token, days, revision])
  function changePeriod(value: number) { setDays(value); history.replaceState({}, '', `/metrics?days=${value}`) }
  function exportDaily() {
    if (!data) return
    const url = URL.createObjectURL(new Blob([dailyCSV(data.daily)], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = `hushful-metrics-${days}-days.csv`; link.click(); URL.revokeObjectURL(url)
  }
  const busiest = data?.daily.reduce<UsageDay | null>((best, day) => !best || day.pageViews > best.pageViews ? day : best, null)
  return <main className="analytics-page">
    <header className="analytics-header"><a href="/" className="analytics-brand">✦ hushful <span>analytics</span></a><div><a href="/" className="analytics-button"><ArrowLeft />Back to app</a><button type="button" className="analytics-button" onClick={logout}><LogOut />Sign out</button></div></header>
    <section className="analytics-title"><div><p className="analytics-eyebrow">Administrator workspace</p><h1>Traffic & growth</h1><p>See how people find Hushful and how activity changes over time.</p></div><span className="analytics-private"><ShieldCheck />Private dashboard</span></section>
    <div className="analytics-toolbar"><div className="analytics-period" role="group" aria-label="Reporting period">{[7,30,90].map(n => <button type="button" key={n} aria-pressed={n === days} onClick={() => changePeriod(n)}>{n} days</button>)}</div><div><span className="analytics-updated">{updated && !loading ? `Updated ${updated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Daily totals use UTC'}</span><button type="button" className="analytics-button" disabled={loading} onClick={() => setRevision(n => n + 1)}><RefreshCw className={loading ? 'spin' : ''} />Refresh</button><button type="button" className="analytics-button" disabled={!data} onClick={exportDaily}><Download />Export daily CSV</button></div></div>
    <nav className="analytics-tabs" aria-label="Metrics sections">{(['overview','audience','sources','activity'] as const).map(tab => <button type="button" key={tab} aria-current={section === tab ? 'page' : undefined} onClick={() => setSection(tab)}>{tab === 'activity' ? 'Recent activity' : tab[0].toUpperCase() + tab.slice(1)}</button>)}</nav>
    {error && <section className="analytics-state" role="alert"><h2>{restricted ? 'Administrator access required' : 'Metrics couldn’t load'}</h2><p>{restricted ? 'Sign in with an administrator account. If admin verification is enabled, complete it during sign-in.' : error}</p><button type="button" className="primary" onClick={restricted ? logout : () => setRevision(n => n + 1)}>{restricted ? 'Use another account' : 'Try again'}</button></section>}
    {loading && <section className="analytics-state" role="status"><RefreshCw className="spin" /><p>Loading your {days}-day report…</p></section>}
    {data && <>
      <p className="analytics-range">{data.daily[0] && dateLabel(data.daily[0].date)} – {data.daily.at(-1) && dateLabel(data.daily.at(-1)!.date)} · UTC · Today is still in progress</p>
      {section === 'overview' && <>
        <div className="analytics-kpis">{(Object.keys(metricLabels) as TrafficMetric[]).map(key => <MetricCard key={key} title={metricLabels[key]} value={data[key]} comparison={weeklyComparison(data.daily,key)} selected={metric === key} onClick={() => setMetric(key)} />)}<article className="analytics-kpi"><span>Opted-in sessions</span><strong>{number(data.consentedSessions)}</strong><small>Across web and iOS</small></article></div>
        <TrafficChart daily={data.daily} metric={metric} setMetric={setMetric} />
        <div className="analytics-insights"><article><span>Average website views</span><strong>{number(Math.round(data.pageViews / data.days))}<small> / day</small></strong></article><article><span>Busiest website day</span><strong>{busiest && busiest.pageViews > 0 ? dateLabel(busiest.date) : 'No traffic yet'}</strong><small>{busiest && busiest.pageViews > 0 ? `${number(busiest.pageViews)} views` : 'Activity appears after collection begins'}</small></article><article><span>Leading referral site</span><strong>{data.referrers[0]?.name ?? 'No referral data'}</strong><small>{data.referrers[0] ? `${number(data.referrers[0].count)} opted-in events` : 'Referral details require opt-in'}</small></article></div>
        <div className="analytics-grid"><Breakdown title="Where traffic comes from" rows={data.referrers} unit="opted-in events" /><Breakdown title="Most active pages & screens" rows={data.pages} unit="events" /></div>
        <details className="analytics-card analytics-daily"><summary>All daily totals · {days} days</summary><div className="analytics-table-wrap"><table><thead><tr><th>Date · UTC</th>{Object.values(metricLabels).map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{data.daily.slice().reverse().map(day => <tr key={day.date}><th scope="row">{day.date}</th>{(Object.keys(metricLabels) as TrafficMetric[]).map(key => <td key={key}>{number(day[key])}</td>)}</tr>)}</tbody></table></div></details>
      </>}
      {section === 'audience' && <><SectionIntro title="Who’s using Hushful" text="These breakdowns describe opted-in events, not unique people. Location is approximate; VPNs and relays can change it." /><div className="analytics-grid"><Breakdown title="Countries" rows={data.countries} countries /><Breakdown title="Cities" rows={data.cities} /><Breakdown title="Devices" rows={data.devices} /><Breakdown title="Browsers" rows={data.browsers} /><Breakdown title="Operating systems" rows={data.operatingSystems} /><Breakdown title="Time zones" rows={data.timezones} /></div></>}
      {section === 'sources' && <><SectionIntro title="How people find you" text="Compare referral sites and tagged campaigns. Direct traffic and people who decline analytics may have no referral information." /><div className="analytics-grid"><Breakdown title="Referral sites" rows={data.referrers} /><Breakdown title="Campaigns" rows={data.campaigns} /><Breakdown title="Pages & screens" rows={data.pages} unit="events" /></div></>}
      {section === 'activity' && <RecentActivity rows={data.recent} />}
      <footer className="analytics-footer"><p>Views, app opens, and store clicks are separate activity counts—not unique people or confirmed installs. Detailed breakdowns cover opted-in traffic. New accounts and items created reflect current records created in this period.</p><p>Usage events are retained for 90 days. No wishlist contents or raw visitor IP addresses are stored. Approximate location: <a href="https://db-ip.com">DB-IP Lite</a>.</p></footer>
    </>}
  </main>
}
function SectionIntro({ title, text }: { title: string; text: string }) { return <div className="analytics-section-intro"><h2>{title}</h2><p>{text}</p></div> }
function MetricCard({ title, value, comparison, selected, onClick }: { title: string; value: number; comparison: ReturnType<typeof weeklyComparison>; selected: boolean; onClick: () => void }) {
  return <button type="button" className={`analytics-kpi ${selected ? 'selected' : ''}`} aria-pressed={selected} onClick={onClick}><span>{title}</span><strong>{number(value)}</strong><small>{comparison ? <><span className={comparison.percent === null ? '' : comparison.percent >= 0 ? 'analytics-positive' : 'analytics-negative'}>{comparison.percent === null ? `${number(comparison.current)} in last 7 complete days` : `${comparison.percent > 0 ? '+' : ''}${comparison.percent.toFixed(0)}%`}</span>{comparison.percent !== null && ' · last 7 complete vs prior 7 days'}</> : 'Select to view daily trend'}</small></button>
}
function TrafficChart({ daily, metric, setMetric }: { daily: UsageDay[]; metric: TrafficMetric; setMetric: (metric: TrafficMetric) => void }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const selected = daily.find(day => day.date === selectedDate) ?? daily.at(-1)
  const max = Math.max(1,...daily.map(day => day[metric]))
  return <section className="analytics-card analytics-chart"><div className="analytics-card-heading"><div><h2>Daily activity</h2><p>Choose a metric, then a day to see its total.</p></div><select aria-label="Chart metric" value={metric} onChange={e => setMetric(e.target.value as TrafficMetric)}>{Object.entries(metricLabels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></div><div className="analytics-chart-readout"><strong>{selected ? number(selected[metric]) : '0'}</strong><span>{metricLabels[metric].toLowerCase()} · {selected ? dateLabel(selected.date) : ''}</span></div><div className="analytics-plot"><div className="analytics-axis"><span>{number(max)}</span><span>{number(Math.round(max/2))}</span><span>0</span></div><div className="analytics-bars" aria-label={`Daily ${metricLabels[metric]}`}>{daily.map(day => <button type="button" key={day.date} aria-label={`${dateLabel(day.date)}: ${number(day[metric])} ${metricLabels[metric]}`} aria-pressed={selected?.date === day.date} title={`${day.date}: ${day[metric]}`} onClick={() => setSelectedDate(day.date)} style={{ height: `${day[metric] > 0 ? Math.max(2,day[metric]/max*100) : 1}%` }} />)}</div></div><div className="analytics-chart-dates"><span>{daily[0] && dateLabel(daily[0].date)}</span><span>{daily[Math.floor(daily.length/2)] && dateLabel(daily[Math.floor(daily.length/2)].date)}</span><span>{daily.at(-1) && dateLabel(daily.at(-1)!.date)}</span></div></section>
}
function Breakdown({ title, rows, unit = 'opted-in events', countries = false }: { title: string; rows: UsageDimension[]; unit?: string; countries?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const total = rows.reduce((sum,row) => sum + row.count,0)
  function label(name: string) { if (!countries) return name; try { return new Intl.DisplayNames(undefined,{ type: 'region' }).of(name) ?? name } catch { return name } }
  return <section className="analytics-card"><div className="analytics-card-heading"><h2>{title}</h2><span>{number(total)} {unit}</span></div>{rows.length ? <><div className="analytics-breakdown">{rows.slice(0,expanded ? 20 : 5).map(row => <div key={row.name}><div><span title={label(row.name)}>{label(row.name)}</span><strong>{number(row.count)} <small>{Math.round(row.count/total*100)}%</small></strong></div><div className="analytics-progress"><span style={{ width: `${row.count/total*100}%` }} /></div></div>)}</div>{rows.length > 5 && <button type="button" className="analytics-text-button" onClick={() => setExpanded(value => !value)}>{expanded ? 'Show top 5' : `Show more (${Math.min(rows.length,20)})`}<ArrowUpRight /></button>}</> : <p className="analytics-empty">No data yet. This section fills in when matching events are recorded.</p>}</section>
}
function RecentActivity({ rows }: { rows: UsageDashboard['recent'] }) {
  const [source, setSource] = useState('all'), [kind, setKind] = useState('all')
  const filtered = rows.filter(row => (source === 'all' || row.source === source) && (kind === 'all' || row.kind === kind))
  return <><SectionIntro title="Recent activity" text="Inspect the latest 100 events in this report. Filters apply to this sample, not the full period totals." /><div className="analytics-card"><div className="analytics-activity-filters"><label>Platform <select aria-label="Platform" value={source} onChange={e => setSource(e.target.value)}><option value="all">All platforms</option><option value="web">Web</option><option value="ios">iOS</option></select></label><label>Event <select aria-label="Event" value={kind} onChange={e => setKind(e.target.value)}><option value="all">All events</option><option value="page_view">Page view</option><option value="app_open">App open</option><option value="app_store_click">App Store click</option></select></label><span>{filtered.length} events</span></div>{!filtered.length && <p className="analytics-empty">No events match these filters.</p>}<div className="analytics-event-list">{filtered.map(row => <article key={row.id}><div><span className="analytics-platform">{row.source}</span><strong>{row.kind.replaceAll('_',' ')}</strong><time dateTime={row.date}>{new Date(row.date).toLocaleString()}</time></div><p>{row.path}</p><small>{row.consented ? [row.country,row.city,row.device,row.browser,row.os,row.version,row.referrer,row.campaign].filter(Boolean).join(' · ') || 'Opted-in event' : 'Anonymous count only'}</small></article>)}</div></div></>
}
