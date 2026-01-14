<script>
    import Calendar from '@event-calendar/core';
    import DayGrid from '@event-calendar/day-grid';
    import TimeGrid from '@event-calendar/time-grid';
    import List from '@event-calendar/list';
    import Interaction from '@event-calendar/interaction';
    import DOMPurify from 'dompurify';
    import CalendarLegend from '$lib/CalendarLegend.svelte';
    import AddToCalendar from '$lib/AddToCalendar.svelte';

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

                <AddToCalendar calendarEvent={selectedEvent} />
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
