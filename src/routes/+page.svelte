<script>
    import Calendar from '@event-calendar/core';
    import DayGrid from '@event-calendar/day-grid';
    import TimeGrid from '@event-calendar/time-grid';
    import List from '@event-calendar/list';
    import Interaction from '@event-calendar/interaction';
    import DOMPurify from 'dompurify';
    import CalendarLegend from '$lib/CalendarLegend.svelte';

    export let data
    export let { events } = data.props

    let plugins = [DayGrid, TimeGrid, List, Interaction];
    let selectedEvent = null;

    function handleEventClick({ event }) {
        selectedEvent = event;
    }

    function handleCloseModal() {
        selectedEvent = null;
    }

    function generateGoogleCalendarLink(event) {
        const title = encodeURIComponent(event.title);
        const start = event.start.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const end = event.end ? event.end.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z' : start;
        const details = event.extendedProps.description ? encodeURIComponent(event.extendedProps.description) : '';
        const location = event.extendedProps.location ? encodeURIComponent(event.extendedProps.location) : '';
        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
        return url;
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

    let options = {
        view: 'dayGridMonth',
        headerToolbar: {
            start: 'prev,next today',
            center: 'title',
            end: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        },
        events,
        eventClick: handleEventClick,
        eventContent: function(arg) {
            let html = `
                <div class="fc-event-main">
                    <div class="fc-event-title">${arg.event.title}</div>
                    <div class="fc-event-time">${arg.timeText}</div>
                </div>
            `;
            return { html };
        }
    };
</script>

<div class="container">
    <Calendar {plugins} {options} />
    {#if selectedEvent}
        <dialog open class="modal">
            <article>
                <header>
                    <a href="#close" aria-label="Close" class="close" on:click={handleCloseModal}></a>
                    <h2>{selectedEvent.title}</h2>
                    {#if selectedEvent.extendedProps.calendarName}
                        <p>📍 {selectedEvent.extendedProps.calendarName}</p>
                    {/if}
                    <p>🗓️ {selectedEvent.start.toLocaleDateString()} {selectedEvent.start.toLocaleTimeString()}</p>
                    {#if selectedEvent.extendedProps.attendees > 1 }
                        <p>🧑🏾 {selectedEvent.extendedProps.attendees} signups</p>
                    {/if}
                </header>
                <p>{@html DOMPurify.sanitize(selectedEvent.extendedProps.description)}</p>
                <form target="_blank" action={selectedEvent?.extendedProps?.signupLink} method="get">
                    <button href={selectedEvent.extendedProps.signupLink}>RSVP</button>
                </form>

                <div class="add-to-calendar-links">
                    <a href={generateGoogleCalendarLink(selectedEvent)} target="_blank" rel="noopener noreferrer">Add to Google Calendar</a>
                    <a href={generateIcalLink(selectedEvent)} download="event.ics">Add to iCal</a>
                </div>
            </article>
        </dialog>
    {/if}
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
