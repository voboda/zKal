<script>
  export let calendarEvent;

  const icsData = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `UID:${calendarEvent.id}`,
    `DTSTAMP:${calendarEvent.start.toISOString().replace(/-|:|\.\d+/g, '')}`,
    `DTSTART:${calendarEvent.start.toISOString().replace(/-|:|\.\d+/g, '')}`,
    `DTEND:${calendarEvent.end.toISOString().replace(/-|:|\.\d+/g, '')}`,
    `SUMMARY:${calendarEvent.title}`,
    `DESCRIPTION:${calendarEvent.extendedProps.description}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\n');

  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8;' });
  const icsFileUrl = URL.createObjectURL(blob);

  const googleCalendarLink = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(calendarEvent.title)}&dates=${calendarEvent.start.toISOString().replace(/-|:|\.\d+/g, '')}/${calendarEvent.end.toISOString().replace(/-|:|\.\d+/g, '')}&details=${encodeURIComponent(calendarEvent.extendedProps.description)}&location=&sf=true&output=xml`;
</script>

<details role="list">
  <summary aria-haspopup="listbox">Add to Calendar</summary>
  <ul role="listbox">
    <li><a href={googleCalendarLink} target="_blank">Google</a></li>
    <li><a href={icsFileUrl} download="event.ics">iCal/Outlook/Apple</a></li>
  </ul>
</details>
