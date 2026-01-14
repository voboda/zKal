<script>
  import { onMount } from 'svelte';
  import { connectToZupass, queryTickets, getState } from '$lib/pod.js';
  import { goto } from '$app/navigation';
  
  let connecting = false;
  let error = null;
  let success = false;
  let userPublicKey = null;
  let tickets = [];
  
  async function handlePODLogin() {
    try {
      connecting = true;
      error = null;
      
      // Connect to Zupass
      const element = document.getElementById('zupass-connector');
      userPublicKey = await connectToZupass(element);
      
      if (!userPublicKey) {
        throw new Error('Failed to connect to Zupass');
      }
      
      // Query tickets
      tickets = await queryTickets([userPublicKey]);
      
      if (tickets.length === 0) {
        throw new Error('No tickets found for this account');
      }
      
      // Create session data
      const sessionData = {
        user: {
          publicKey: userPublicKey,
          email: 'pod-user@example.com',
          name: 'POD User'
        },
        tickets: tickets.map(ticket => ({
          id: ticket.entries?.ticket_id?.value || 'unknown',
          eventId: ticket.entries?.event_id?.value || 'unknown',
          eventName: ticket.entries?.event_name?.value || 'Unknown Event'
        })),
        connectedAt: Date.now()
      };
      
      // Submit to server
      const formData = new FormData();
      formData.append('sessionData', JSON.stringify(sessionData));
      
      const response = await fetch('/login', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        success = true;
        goto('/');
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Login failed');
      }
    } catch (err) {
      error = err.message;
      console.error('POD login error:', err);
    } finally {
      connecting = false;
    }
  }
</script>

<main class="container">
  <h1>Login with POD Tickets</h1>
  
  {#if error}
    <div class="error">
      <p><strong>Error:</strong> {error}</p>
    </div>
  {/if}
  
  {#if success}
    <div class="success">
      <p>Login successful! Redirecting...</p>
    </div>
  {:else}
    <div>
      <p>Connect to Zupass to access your POD tickets:</p>
      <div id="zupass-connector"></div>
      <button 
        on:click={handlePODLogin} 
        disabled={connecting}
        class="primary"
      >
        {connecting ? 'Connecting...' : 'Connect with Zupass'}
      </button>
    </div>
  {/if}
  
  <style>
    .error {
      color: red;
      padding: 1rem;
      border: 1px solid red;
      margin-bottom: 1rem;
    }
    .success {
      color: green;
      padding: 1rem;
      border: 1px solid green;
      margin-bottom: 1rem;
    }
    button {
      margin-top: 1rem;
    }
  </style>
</main>
