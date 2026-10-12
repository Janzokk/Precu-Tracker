import { useEffect, useState } from 'react'
import './App.css'

const DAY_ENTRIES_STORAGE_KEY = 'precu-tracker-day-entries'
const MONTHLY_TARGETS_STORAGE_KEY = 'precu-tracker-monthly-targets'

function loadStoredValue(key, fallback) {
  try {
    const storedValue = localStorage.getItem(key)
    return storedValue ? JSON.parse(storedValue) : fallback
  } catch {
    return fallback
  }
}

function saveStoredValue(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Keep the app usable if browser storage is unavailable.
  }
}

export const months = Array.from({ length: 13 }, (_, index) => {
  const date = new Date(2026, 8 + index, 1)
  const year = date.getFullYear()
  const monthNumber = date.getMonth() + 1
  const daysInMonth = new Date(year, monthNumber, 0).getDate()
  const month = date.toLocaleString('ca-ES', { month: 'long' })
  const monthKey = `${year}-${String(monthNumber).padStart(2, '0')}`

  return {
    month,
    year,
    monthNumber,
    daysInMonth,
    startDate: `${monthKey}-01`,
    endDate: `${monthKey}-${String(daysInMonth).padStart(2, '0')}`,
  }
})

export const calendarWeekdays = [
  'Dilluns',
  'Dimarts',
  'Dimecres',
  'Dijous',
  'Divendres',
  'Dissabte',
  'Diumenge',
]

export const calendarWeekdayShort = ['DL', 'DT', 'DM', 'DJ', 'DV', 'DS', 'DG']

function App() {
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0)
  const [activeDate, setActiveDate] = useState(null)
  const [configurationOpen, setConfigurationOpen] = useState(false)
  const [configurationMonthIndex, setConfigurationMonthIndex] = useState(0)
  const [monthlyTargets, setMonthlyTargets] = useState(() => ({
    ...Object.fromEntries(months.map((month) => [
      `${month.year}-${String(month.monthNumber).padStart(2, '0')}`,
      50,
    ])),
    ...loadStoredValue(MONTHLY_TARGETS_STORAGE_KEY, {}),
  }))
  const [dayEntries, setDayEntries] = useState(() => loadStoredValue(DAY_ENTRIES_STORAGE_KEY, {}))

  useEffect(() => {
    saveStoredValue(DAY_ENTRIES_STORAGE_KEY, dayEntries)
  }, [dayEntries])

  useEffect(() => {
    saveStoredValue(MONTHLY_TARGETS_STORAGE_KEY, monthlyTargets)
  }, [monthlyTargets])
  const selectedMonth = months[selectedMonthIndex]
  const monthKey = `${selectedMonth.year}-${String(selectedMonth.monthNumber).padStart(2, '0')}`
  const monthlyTarget = Number(monthlyTargets[monthKey]) || 0
  const monthlyHours = Object.entries(dayEntries).reduce((total, [date, entry]) => (
    date.startsWith(`${monthKey}-`) ? total + (Number(entry.value) || 0) : total
  ), 0)
  const totalHours = Object.values(dayEntries).reduce(
    (total, entry) => total + (Number(entry.value) || 0),
    0,
  )
  const selectedMonthDate = new Date(selectedMonth.year, selectedMonth.monthNumber - 1, 1)
  const selectedMonthName = selectedMonth.month
  const daysInSelectedMonth = selectedMonth.daysInMonth
  const firstWeekday = (selectedMonthDate.getDay() + 6) % 7
  const calendarDays = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInSelectedMonth }, (_, index) => index + 1),
  ]

  while (calendarDays.length % 7 !== 0) calendarDays.push(null)

  const selectedMonthCalendar = Array.from(
    { length: calendarDays.length / 7 },
    (_, weekIndex) => calendarDays.slice(weekIndex * 7, weekIndex * 7 + 7),
  )

  const activeEntry = activeDate
    ? dayEntries[activeDate.key] ?? { value: 0, studies: 0 }
    : null

  const updateActiveEntry = (field, value) => {
    setDayEntries((entries) => ({
      ...entries,
      [activeDate.key]: {
        ...(entries[activeDate.key] ?? { value: 0, studies: 0 }),
        [field]: value,
      },
    }))
  }

  const monthCalendarGrid = (
    <section className="calendar" aria-label={`${selectedMonthName} ${selectedMonth.year}`}>
      <header className="calendar-header">
        <button
          type="button"
          className="month-nav"
          aria-label="Mes anterior"
          disabled={selectedMonthIndex === 0}
          onClick={() => setSelectedMonthIndex((index) => index - 1)}
        >
          &larr;
        </button>
        <h1>{selectedMonthName} {selectedMonth.year}</h1>
        <button
          type="button"
          className="configure-button"
          aria-label="Configura les hores mensuals"
          title="Configura les hores mensuals"
          onClick={() => {
            setConfigurationMonthIndex(selectedMonthIndex)
            setConfigurationOpen(true)
          }}
        >
          <span aria-hidden="true">⚙</span>
        </button>
        <button
          type="button"
          className="month-nav"
          aria-label="Mes següent"
          disabled={selectedMonthIndex === months.length - 1}
          onClick={() => setSelectedMonthIndex((index) => index + 1)}
        >
          &rarr;
        </button>
      </header>
      <section className="monthly-progress" aria-label="Progrés mensual d'hores">
        <div className="monthly-progress-label">
          <span>Hores d'aquest mes</span>
          <span>{monthlyHours} / {monthlyTarget}</span>
        </div>
        <progress value={Math.min(monthlyHours, monthlyTarget)} max={Math.max(monthlyTarget, 1)} aria-label={`${monthlyHours} de ${monthlyTarget} hores`} />
      </section>
      <div className="calendar-grid" role="grid">
        {calendarWeekdays.map((weekday, index) => (
          <div className="calendar-weekday" role="columnheader" key={weekday}>
            <span className="weekday-full">{weekday}</span>
            <span className="weekday-initial" aria-hidden="true">{calendarWeekdayShort[index]}</span>
          </div>
        ))}
        {selectedMonthCalendar.flatMap((week, weekIndex) =>
          week.map((day, dayIndex) => (
            <div className="calendar-cell" role="gridcell" key={`${weekIndex}-${dayIndex}`}>
              {day ? (
                <button
                  type="button"
                  className={Number(dayEntries[`${selectedMonth.year}-${String(selectedMonth.monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`]?.value) > 0 ? 'has-hours' : undefined}
                  aria-label={`${day} de ${selectedMonthName} de ${selectedMonth.year}`}
                  onClick={() => setActiveDate({
                    key: `${selectedMonth.year}-${String(selectedMonth.monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
                    label: `${day} de ${selectedMonthName} de ${selectedMonth.year}`,
                  })}
                >
                  {day}
                </button>
              ) : null}
            </div>
          )),
        )}
      </div>
    </section>
  )

  return (
    <main>
      {monthCalendarGrid}
      <section className="overall-progress" aria-label="Progrés total d'hores">
        <div className="monthly-progress-label">
          <span>Hores de tots els mesos</span>
          <span>{totalHours} / 600</span>
        </div>
        <progress value={Math.min(totalHours, 600)} max="600" aria-label={`${totalHours} de 600 hores`} />
      </section>
      {activeDate && (
        <div className="modal-backdrop" onClick={(event) => {
          if (event.target === event.currentTarget) setActiveDate(null)
        }}>
          <section className="day-modal" role="dialog" aria-modal="true" aria-labelledby="day-modal-title">
            <button className="modal-close" type="button" aria-label="Tanca els detalls del dia" onClick={() => setActiveDate(null)}>
              &times;
            </button>
            <h2 id="day-modal-title">{activeDate.label}</h2>
            <label className="modal-field">
              Hores
              <span className="stepper">
                <button
                  type="button"
                  aria-label="Redueix les hores"
                  disabled={Number(activeEntry.value) <= 0}
                  onClick={() => updateActiveEntry('value', Math.max(0, Number(activeEntry.value || 0) - 1))}
                >
                  −
                </button>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={activeEntry.value}
                  onChange={(event) => {
                    const value = event.target.value
                    updateActiveEntry('value', value === '' ? '' : Math.max(0, Number(value)))
                  }}
                />
                <button type="button" aria-label="Augmenta les hores" onClick={() => updateActiveEntry('value', Number(activeEntry.value || 0) + 1)}>
                  +
                </button>
              </span>
            </label>
            <label className="modal-field">
              Estudis realitzats
              <input
                type="number"
                min="0"
                step="1"
                value={activeEntry.studies}
                onChange={(event) => updateActiveEntry('studies', event.target.value === '' ? '' : Number(event.target.value))}
              />
            </label>
          </section>
        </div>
      )}
      {configurationOpen && (
        <div className="modal-backdrop" onClick={(event) => {
          if (event.target === event.currentTarget) setConfigurationOpen(false)
        }}>
          <section className="day-modal" role="dialog" aria-modal="true" aria-labelledby="configuration-title">
            <button className="modal-close" type="button" aria-label="Tanca la configuració" onClick={() => setConfigurationOpen(false)}>
              &times;
            </button>
            <h2 id="configuration-title">Configuració mensual</h2>
            <label className="modal-field">
              Mes
              <select
                value={configurationMonthIndex}
                onChange={(event) => setConfigurationMonthIndex(Number(event.target.value))}
              >
                {months.map((month, index) => (
                  <option value={index} key={`${month.year}-${month.monthNumber}`}>
                    {month.month} {month.year}
                  </option>
                ))}
              </select>
            </label>
            <label className="modal-field">
              Hores previstes
              <input
                type="number"
                min="0"
                step="1"
                value={monthlyTargets[`${months[configurationMonthIndex].year}-${String(months[configurationMonthIndex].monthNumber).padStart(2, '0')}`]}
                onChange={(event) => {
                  const month = months[configurationMonthIndex]
                  const key = `${month.year}-${String(month.monthNumber).padStart(2, '0')}`
                  const value = event.target.value
                  setMonthlyTargets((targets) => ({
                    ...targets,
                    [key]: value === '' ? '' : Math.max(0, Number(value)),
                  }))
                }}
              />
            </label>
          </section>
        </div>
      )}
    </main>
  )
}

export default App
