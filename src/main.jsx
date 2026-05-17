import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  LayoutGrid,
  ListChecks,
  Plus,
  Sparkles,
} from 'lucide-react';
import './styles.css';

const STORAGE_KEY = 'cozy-content-planner:v1';
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const BUCKETS = [
  { name: 'Dream', color: '#C4909A', accent: '#F6D8D6' },
  { name: 'Method', color: '#A77C88', accent: '#EBD3D8' },
  { name: 'Income', color: '#8B5E6A', accent: '#DDBCC5' },
  { name: 'Community', color: '#BFA27A', accent: '#EFE1C8' },
  { name: 'Freebie Funnel', color: '#7F8F75', accent: '#DCE7D5' },
];

const FORMATS = ['Reel', 'Carousel', 'Image'];
const STATUSES = ['Draft', 'Ready', 'Posted'];
const DEFAULT_KEYWORDS = ['THEME', 'STOCKPHOTOS', 'FACELESS', 'INCOME', 'none'];

function toKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date, count) {
  const next = new Date(date);
  next.setDate(next.getDate() + count);
  return next;
}

function startOfWeek(date) {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + diff);
  return next;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthGrid(date) {
  const start = startOfWeek(startOfMonth(date));
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function formatRange(start) {
  const end = addDays(start, 6);
  return `${start.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}`;
}

function emptySlot(date, bucket = BUCKETS[0].name) {
  return {
    id: `${date}-${crypto.randomUUID()}`,
    date,
    bucket,
    caption: '',
    format: FORMATS[0],
    keyword: 'none',
    status: STATUSES[0],
    image: '',
  };
}

function getInitialPlanner() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored?.slots && stored?.keywords) {
      return stored;
    }
  } catch {
    // Start fresh if localStorage contains invalid JSON.
  }

  return {
    keywords: DEFAULT_KEYWORDS,
    slots: {},
  };
}

function App() {
  const [planner, setPlanner] = useState(getInitialPlanner);
  const [view, setView] = useState('weekly');
  const [anchorDate, setAnchorDate] = useState(new Date());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(planner));
  }, [planner]);

  const weekStart = useMemo(() => startOfWeek(anchorDate), [anchorDate]);
  const weekKeys = useMemo(
    () => Array.from({ length: 28 }, (_, index) => toKey(addDays(weekStart, index))),
    [weekStart],
  );

  const weekSlots = weekKeys.flatMap((key) => planner.slots[key] ?? []);
  const bucketCounts = BUCKETS.map((bucket) => ({
    ...bucket,
    count: weekSlots.filter((slot) => slot.bucket === bucket.name).length,
  }));
  const maxBucketCount = Math.max(1, ...bucketCounts.map((bucket) => bucket.count));

  const updateSlot = (dateKey, slotId, updates) => {
    setPlanner((current) => ({
      ...current,
      slots: {
        ...current.slots,
        [dateKey]: (current.slots[dateKey] ?? []).map((slot) =>
          slot.id === slotId ? { ...slot, ...updates } : slot,
        ),
      },
    }));
  };

  const addSlot = (dateKey, bucket = BUCKETS[0].name) => {
    setPlanner((current) => ({
      ...current,
      slots: {
        ...current.slots,
        [dateKey]: [...(current.slots[dateKey] ?? []), emptySlot(dateKey, bucket)],
      },
    }));
  };

  const addKeyword = (keyword) => {
    const normalized = keyword.trim().toUpperCase();
    if (!normalized) return;

    setPlanner((current) => {
      if (current.keywords.includes(normalized)) return current;
      return { ...current, keywords: [...current.keywords.filter((tag) => tag !== 'none'), normalized, 'none'] };
    });
  };

  const movePeriod = (direction) => {
    setAnchorDate((date) => {
      const next = new Date(date);
      if (view === 'weekly') next.setDate(next.getDate() + direction * 28);
      if (view === 'monthly') next.setMonth(next.getMonth() + direction);
      if (view === 'quarterly') next.setMonth(next.getMonth() + direction * 3);
      return next;
    });
  };

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Content buckets">
        <div className="brand-card">
          <Sparkles size={22} aria-hidden="true" />
          <div>
            <p className="eyebrow">Instagram planner</p>
            <h1>@cottage.core.designs</h1>
          </div>
        </div>

        <section className="bucket-list" aria-label="Current week bucket counts">
          <div className="section-title">
            <span>This week</span>
            <strong>{weekSlots.length} posts</strong>
          </div>
          {bucketCounts.map((bucket) => (
            <div className="bucket-row" key={bucket.name}>
              <span className="bucket-dot" style={{ backgroundColor: bucket.color }} />
              <span>{bucket.name}</span>
              <strong>{bucket.count}</strong>
            </div>
          ))}
        </section>
      </aside>

      <section className="planner">
        <header className="topbar">
          <div>
            <p className="eyebrow">Cozy content journal</p>
            <h2>
              {view === 'weekly' && `${weekStart.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })} - ${addDays(weekStart, 27).toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' })}`}
              {view === 'monthly' && anchorDate.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}
              {view === 'quarterly' && (
                `${anchorDate.toLocaleDateString('en-AU', { month: 'long' })} - ${new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 2, 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}`
              )}
            </h2>
          </div>

          <div className="toolbar">
            <div className="view-toggle" aria-label="Planner view">
              <button className={view === 'weekly' ? 'active' : ''} onClick={() => setView('weekly')} type="button">
                <ListChecks size={18} aria-hidden="true" />
                Week
              </button>
              <button className={view === 'monthly' ? 'active' : ''} onClick={() => setView('monthly')} type="button">
                <CalendarDays size={18} aria-hidden="true" />
                Month
              </button>
              <button className={view === 'quarterly' ? 'active' : ''} onClick={() => setView('quarterly')} type="button">
                <CalendarDays size={18} aria-hidden="true" />
                Quarter
              </button>
            </div>

            <div className="period-controls">
              <button onClick={() => movePeriod(-1)} type="button" aria-label="Previous period">
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button onClick={() => setAnchorDate(new Date())} type="button">
                Today
              </button>
              <button onClick={() => movePeriod(1)} type="button" aria-label="Next period">
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
        </header>

        <BalanceBar bucketCounts={bucketCounts} maxBucketCount={maxBucketCount} />

        {view === 'weekly' && (
          <WeeklyView
            weekKeys={weekKeys}
            slots={planner.slots}
            keywords={planner.keywords}
            onAddSlot={addSlot}
            onAddKeyword={addKeyword}
            onUpdateSlot={updateSlot}
          />
        )}
        {view === 'monthly' && (
          <MonthlyView
            anchorDate={anchorDate}
            slots={planner.slots}
            keywords={planner.keywords}
            onAddSlot={addSlot}
            onAddKeyword={addKeyword}
            onUpdateSlot={updateSlot}
          />
        )}
        {view === 'quarterly' && (
          <QuarterlyView
            anchorDate={anchorDate}
            slots={planner.slots}
            keywords={planner.keywords}
            onAddSlot={addSlot}
            onAddKeyword={addKeyword}
            onUpdateSlot={updateSlot}
          />
        )}
      </section>
    </main>
  );
}

function BalanceBar({ bucketCounts, maxBucketCount }) {
  return (
    <section className="balance-panel" aria-label="Weekly bucket balance">
      <div className="balance-heading">
        <div>
          <p className="eyebrow">Bucket balance</p>
          <h3>Keep the feed feeling layered</h3>
        </div>
        <LayoutGrid size={22} aria-hidden="true" />
      </div>

      <div className="balance-bars">
        {bucketCounts.map((bucket) => (
          <div className="balance-item" key={bucket.name}>
            <div className="balance-label">
              <span>{bucket.name}</span>
              <strong>{bucket.count}</strong>
            </div>
            <div className="balance-track">
              <span
                className="balance-fill"
                style={{
                  width: `${Math.max(8, (bucket.count / maxBucketCount) * 100)}%`,
                  backgroundColor: bucket.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function WeeklyView({ weekKeys, slots, keywords, onAddSlot, onAddKeyword, onUpdateSlot }) {
  return (
    <div className="week-grid">
      {weekKeys.map((dateKey) => (
        <DayColumn
          key={dateKey}
          dateKey={dateKey}
          slots={slots[dateKey] ?? []}
          keywords={keywords}
          onAddSlot={onAddSlot}
          onAddKeyword={onAddKeyword}
          onUpdateSlot={onUpdateSlot}
          compact={false}
        />
      ))}
    </div>
  );
}

function MonthlyView({ anchorDate, slots, keywords, onAddSlot, onAddKeyword, onUpdateSlot }) {
  const days = monthGrid(anchorDate);
  const currentMonth = anchorDate.getMonth();

  return (
    <div className="month-grid">
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
        <div className="month-weekday" key={day}>
          {day}
        </div>
      ))}
      {days.map((date) => {
        const dateKey = toKey(date);
        return (
          <DayColumn
            key={dateKey}
            dateKey={dateKey}
            slots={slots[dateKey] ?? []}
            keywords={keywords}
            onAddSlot={onAddSlot}
            onAddKeyword={onAddKeyword}
            onUpdateSlot={onUpdateSlot}
            compact
            muted={date.getMonth() !== currentMonth}
          />
        );
      })}
    </div>
  );
}

function QuarterlyView({ anchorDate, slots, keywords, onAddSlot, onAddKeyword, onUpdateSlot }) {
  const start = startOfWeek(startOfMonth(anchorDate));
  const days = Array.from({ length: 91 }, (_, index) => addDays(start, index)); // 13 weeks

  return (
    <div className="month-grid">
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
        <div className="month-weekday" key={day}>
          {day}
        </div>
      ))}
      {days.map((date) => {
        const dateKey = toKey(date);
        return (
          <DayColumn
            key={dateKey}
            dateKey={dateKey}
            slots={slots[dateKey] ?? []}
            keywords={keywords}
            onAddSlot={onAddSlot}
            onAddKeyword={onAddKeyword}
            onUpdateSlot={onUpdateSlot}
            compact
            muted={false}
          />
        );
      })}
    </div>
  );
}

function DayColumn({ dateKey, slots, keywords, onAddSlot, onAddKeyword, onUpdateSlot, compact, muted = false }) {
  const date = parseKey(dateKey);
  const monthAltClass = `month-alt-${date.getMonth() % 4}`;

  return (
    <article className={`day-card ${compact ? 'compact' : ''} ${muted ? 'muted' : ''} ${monthAltClass}`}>
      <header className="day-header">
        <div>
          <p>{date.toLocaleDateString('en-AU', { weekday: compact ? 'short' : 'long' })}</p>
          <h3>{date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</h3>
        </div>
        <button onClick={() => onAddSlot(dateKey)} type="button" aria-label={`Add post on ${dateKey}`}>
          <Plus size={17} aria-hidden="true" />
        </button>
      </header>

      <div className="slot-stack">
        {slots.length === 0 && (
          <button className="empty-add-btn" onClick={() => onAddSlot(dateKey)} type="button" aria-label={`Add post on ${dateKey}`}>
            <Plus size={22} aria-hidden="true" />
          </button>
        )}
        {slots.map((slot) => (
          <PostSlot
            key={slot.id}
            dateKey={dateKey}
            slot={slot}
            keywords={keywords}
            onAddKeyword={onAddKeyword}
            onUpdateSlot={onUpdateSlot}
            compact={compact}
          />
        ))}
      </div>
    </article>
  );
}

function PostSlot({ dateKey, slot, keywords, onAddKeyword, onUpdateSlot, compact }) {
  const bucket = BUCKETS.find((item) => item.name === slot.bucket) ?? BUCKETS[0];

  const handleImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      onUpdateSlot(dateKey, slot.id, { image: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const handleKeyword = (value) => {
    if (value === '__new') {
      const next = window.prompt('Add a new funnel keyword');
      if (!next) return;
      onAddKeyword(next);
      onUpdateSlot(dateKey, slot.id, { keyword: next.trim().toUpperCase() });
      return;
    }
    onUpdateSlot(dateKey, slot.id, { keyword: value });
  };

  return (
    <div className="post-slot" style={{ '--bucket': bucket.color, '--bucket-soft': bucket.accent }}>
      <div className="slot-topline">
        <select value={slot.bucket} onChange={(event) => onUpdateSlot(dateKey, slot.id, { bucket: event.target.value })}>
          {BUCKETS.map((item) => (
            <option key={item.name}>{item.name}</option>
          ))}
        </select>
        <select value={slot.status} onChange={(event) => onUpdateSlot(dateKey, slot.id, { status: event.target.value })}>
          {STATUSES.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </div>

      <textarea
        aria-label="Caption"
        placeholder={compact ? 'Caption idea...' : 'Write the caption, hook, or tiny seed of the post...'}
        value={slot.caption}
        onChange={(event) => onUpdateSlot(dateKey, slot.id, { caption: event.target.value })}
        rows={compact ? 3 : 5}
      />

      <div className="field-row">
        <select value={slot.format} onChange={(event) => onUpdateSlot(dateKey, slot.id, { format: event.target.value })}>
          {FORMATS.map((format) => (
            <option key={format}>{format}</option>
          ))}
        </select>
        <select value={slot.keyword} onChange={(event) => handleKeyword(event.target.value)}>
          {keywords.map((keyword) => (
            <option key={keyword}>{keyword}</option>
          ))}
          <option value="__new">+ Add new tag</option>
        </select>
      </div>

      <label className="image-uploader">
        {slot.image ? (
          <img src={slot.image} alt="Uploaded post preview" />
        ) : (
          <span>
            <ImagePlus size={18} aria-hidden="true" />
            Add image
          </span>
        )}
        <input type="file" accept="image/*" onChange={handleImage} />
      </label>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
