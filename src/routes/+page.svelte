<script>
    import { onMount } from 'svelte';
    import Calendar from '@event-calendar/core';
    import DayGrid from '@event-calendar/day-grid';
    import TimeGrid from '@event-calendar/time-grid';
    import List from '@event-calendar/list';
    import Interaction from '@event-calendar/interaction';
    import DOMPurify from 'dompurify';
    import CalendarLegend from '$lib/CalendarLegend.svelte';
    import AddToCalendar from '$lib/AddToCalendar.svelte';
    import { createTicketPOD, getState, ensureZupassConnection, insertPOD, connectToZupass } from '$lib/pod';

    export let data;
    export let { events } = data.props;

    let plugins = [DayGrid, TimeGrid, List, Interaction];
    let selectedEvent = null;
    let showSelectedEvent = false;
    let isCreatingTicket = false;
    let isConnecting = false;
    let errorMessage = null;
    let zupassElement = null;

    onMount(async () => {
        await connectToZupass(zupassElement);
        });

    function handleEventClick({ event }) {
        selectedEvent = event;
        showSelectedEvent = true;
    }

    function handleCloseModal() {
        showSelectedEvent = false;
        errorMessage = null;
    }

    async function handleRSVP(event) {
        event.preventDefault();
        isCreatingTicket = true;
        errorMessage = null;
        console.log("RSVP process started for event:", selectedEvent.title);

        let podState = getState();

        // If not connected, initiate Zupass connection
        if (!podState.connected || !podState.z) {
          isConnecting = true;
          console.log("No Zupass connection detected, initiating connection...");
          if (!zupassElement) {
            // Wait for the element to be bound
            await new Promise(resolve => setTimeout(resolve, 0));
            if (!zupassElement) {
              throw new Error('Zupass connector element not found');
            }
          }
          await connectToZupass(zupassElement);
          console.log("RSVP Zupass connection established successfully");
          isConnecting = false;
          // Refresh state after connection
          podState = getState();
        }

        //const userEmail = podState.userPublicKey ? `${podState.userPublicKey.slice(0, 8)}@zupass.org` : null;
        const userEmail = "zupasstest@voboda.com";

        if (!podState.userPublicKey) {
            console.error("No user public key available");
            errorMessage = "Please connect with Zupass first";
            isCreatingTicket = false;
            return;
        }

        console.log("User authenticated with email:", userEmail);

        try {
            console.log("Creating ticket POD...");

            showSelectedEvent=false;

            console.log('selectedEvent', selectedEvent);

            const result = await createTicketPOD({
                eventName: selectedEvent.title,
                eventId: selectedEvent.id || selectedEvent.extendedProps?.eventId,
                ticketType: "general",
                productId: selectedEvent.extendedProps?.productId || "default",
                eventStartDate: BigInt(Date.now()),
                attendeeName: "Attendee",
                attendeeEmail: userEmail,
                attendeePublicKey: podState.userPublicKey,
                //privateKey: podState.issuerPrivateKey
            });

            console.log("Ticket POD created:", {
                ticketId: result.ticketId,
                signature: result.signature
            });

            console.log("Inserting ticket POD into collection...");
            await insertPOD("Tickets", result.pod);
            console.log("Ticket POD inserted successfully");

            alert("Ticket created successfully!");
            handleCloseModal();
        } catch (error) {
            console.error("Ticket creation failed:", error);
            errorMessage = `Failed to create ticket: ${error.message}`;

        } finally {
            isCreatingTicket = false;
        }
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
    {#if showSelectedEvent && selectedEvent}
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
                <form on:submit|preventDefault={handleRSVP}>
                    <button type="submit" disabled={isCreatingTicket || isConnecting}>
                        {isConnecting ? 'Connecting to Zupass...' : isCreatingTicket ? 'Creating Ticket...' : 'RSVP'}
                    </button>
                </form>
                {#if errorMessage}
                    <div class="error-message">
                        {errorMessage}
                    </div>
                {/if}
                <AddToCalendar calendarEvent={selectedEvent} />
            </article>
        </dialog>
    {/if}
</div>
<!--<div bind:this={zupassElement} id="zupass-connector" style="position: fixed; bottom: 0; right: 0; width: 1px; height: 1px; opacity: 0;"></div>-->
<div bind:this={zupassElement} id="zupass-connector" style="position: fixed; bottom: 0; right: 0; width: 1px; height: 1px; opacity: 0;"></div>

<style>
    .error-message {
        color: #d32f2f;
        background-color: #ffebee;
        padding: 10px;
        border-radius: 4px;
        margin-top: 10px;
        text-align: center;
    }
</style>
