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


async function handleRSVP_2(event) {
    event.preventDefault();
    isCreatingTicket = true;
    errorMessage = null;
    
    const eventToProcess = selectedEvent;
    showSelectedEvent = false;
    
    await new Promise(resolve => setTimeout(resolve, 100));

    const podState = getState();

    // Add detailed connection check
    console.log("=== CONNECTION CHECK ===");
    console.log("podState.connected:", podState.connected);
    console.log("podState.z:", podState.z);
    console.log("podState.z.pod:", podState.z?.pod);
    console.log("podState.z.pod.sign:", podState.z?.pod?.sign);
    
    if (!podState.connected || !podState.z) {
        console.log("Connection not established, connecting now...");
        try {
            await connectToZupass(zupassElement);
            console.log("Connection successful");
        } catch (error) {
            console.error("Connection failed:", error);
            errorMessage = `Failed to connect: ${error.message}`;
            isCreatingTicket = false;
            return;
        }
    }

    try {
        console.log("About to create ticket POD...");
        const ticketParams = {
            eventName: eventToProcess.title,
            eventId: eventToProcess.id || eventToProcess.extendedProps?.eventId,
            ticketType: "general",
            productId: eventToProcess.extendedProps?.productId || "default",
            attendeeName: "Attendee",
            attendeeEmail: `${getState().userPublicKey.slice(0, 8)}@zupass.org`,
            attendeePublicKey: getState().userPublicKey,
        };
        
        console.log("Calling createTicketPOD with params:", ticketParams);
        
        // Wrap in try-catch to see exact error
        const result = await createTicketPOD(ticketParams);
        
        console.log("Ticket created successfully:", result);
        
        await insertPOD("Tickets", result.pod);
        alert("Ticket created!");
        
    } catch (error) {
        console.error("=== ERROR DETAILS ===");
        console.error("Error type:", error.constructor.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
        console.error("Result", result);
        
        // Check if it's the UserClosedDialogError
        if (error.message.includes("closed") || error.message.includes("dialog")) {
            errorMessage = "Zupass popup was closed. Please check if popups are blocked.";
        } else {
            errorMessage = `Failed: ${error.message}`;
        }
        
        selectedEvent = eventToProcess; // Reopen modal on error
        showSelectedEvent = true;
    } finally {
        isCreatingTicket = false;
    }
}

    async function handleTestTicket(event) {
        event.preventDefault();
        isCreatingTicket = true;
        errorMessage = null;
        console.log("TEST TICKET: Running dummy ticket creation");

        try {
            
            // Create a dummy ticket result
            const dummyResult = {
                ticketId: "test-ticket-" + Date.now(),
                signature: "dummy-signature-" + Math.random().toString(36).substring(2),
                signerPublicKey: "dummy-public-key-" + Math.random().toString(36).substring(2),
                pod: {
                    signature: "dummy-pod-signature-" + Math.random().toString(36).substring(2),
                    entries: {
                        ticketId: { type: "string", value: "test-ticket-" + Date.now() },
                        eventName: { type: "string", value: "Test Event" },
                        eventId: { type: "string", value: "test-event-id" },
                        productId: { type: "string", value: "general" },
                        attendeeName: { type: "string", value: "Test Attendee" },
                        attendeeEmail: { type: "string", value: "test@example.com" },
                        attendeePublicKey: { type: "eddsa_pubkey", value: "dummy-owner-key" },
                        ticketType: { type: "string", value: "ga" },
                    }
                }
            };

                     console.log('creating...', dummyResult.pod.entries)
            const result = await createTicketPOD(dummyResult.pod.entries);
            
            console.log('inserting...')
            const insert =  await insertPOD("Tickets", result.pod);
            k
            // Show success message
            alert("Test ticket created successfully!\nTicket ID: " + dummyResult.ticketId);
            
        } catch (error) {
            console.error("Test ticket creation failed:", error);
            errorMessage = `Test failed: ${error.message}`;
        } finally {
            isCreatingTicket = false;
        }
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
          console.log("Zupass connection established successfully");
          isConnecting = false;
          // Refresh state after connection
          podState = getState();
        }

        //const userEmail = podState.userPublicKey ? `${podState.userPublicKey.slice(0, 8)}@zupass.org` : null;
        const userEmail = "zupasstest@voboda.com";

        if (!userEmail) {
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
                <form on:submit|preventDefault={handleTestTicket}>
                    <button type="submit" disabled={isCreatingTicket || isConnecting}>
                        {isConnecting ? 'Connecting to Zupass...' : isCreatingTicket ? 'Creating Ticket...' : 'TEST TICKET'}
                    </button>
                </form>
 
    <Calendar {plugins} {options} />
    {#if showSelectedEvent}
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
    .add-to-calendar-links {
        display: flex;
        flex-direction: row;
        gap: 2.5rem;
        margin-top: 1rem;
        justify-content: center;
    }

    .error-message {
        color: #d32f2f;
        background-color: #ffebee;
        padding: 10px;
        border-radius: 4px;
        margin-top: 10px;
        text-align: center;
    }
</style>
