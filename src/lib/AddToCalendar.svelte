<script>
  export let calendarEvent;

  function generateGoogleCalendarLink(event) {
    const title = encodeURIComponent(event.title);
    const start = event.start.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const end = event.end ? event.end.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z' : start;
    const details = event.extendedProps.description ? encodeURIComponent(event.extendedProps.description) : '';
    const location = event.extendedProps.location ? encodeURIComponent(event.extendedProps.location) : '';
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
  }

  function generateIcalLink(event) {
    const icalData = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Event Calendar//EN',
      'BEGIN:VEVENT',
      `SUMMARY:${event.title}`,
      `DTSTART:${formatIcalDate(event.start)}`,
      `DTEND:${formatIcalDate(event.end || event.start)}`,
      event.extendedProps.description ? `DESCRIPTION:${escapeIcalText(event.extendedProps.description)}` : '',
      event.extendedProps.location ? `LOCATION:${escapeIcalText(event.extendedProps.location)}` : '',
      'END:VEVENT',
      'END:VCALENDAR'
    ].filter(line => line !== '').join('\r\n');

    const blob = new Blob([icalData], { type: 'text/calendar;charset=utf-8' });
    return URL.createObjectURL(blob);
  }

  function formatIcalDate(date) {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  function escapeIcalText(text) {
    return text.replace(/\\/g, '\\\\')
               .replace(/;/g, '\\;')
               .replace(/,/g, '\\,')
               .replace(/\n/g, '\\n');
  }
</script>

<div class="add-to-calendar-links">
  <a href={generateGoogleCalendarLink(calendarEvent)} target="_blank" rel="noopener noreferrer">Add to Google Calendar</a>
  <a href={generateIcalLink(calendarEvent)} download="event.ics">Add to iCal</a>
</div>

<style>
  .add-to-calendar-links {
    display: flex;
    flex-direction: row;
    gap: 2.5rem;
    margin-top: 1rem;
    justify-content: center;
  }
</style>
