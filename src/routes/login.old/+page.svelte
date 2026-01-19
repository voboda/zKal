<script>
  import { onMount } from 'svelte';
  import { connectToZupass, getState } from '$lib/pod.js';
  import { goto } from '$app/navigation';
  
  let connecting = false;
  let error = null;
  
  async function handlePODLogin() {
    try {
      connecting = true;
      error = null;
      
      // Connect to Zupass
      const element = document.getElementById('zupass-connector');
      const userPublicKey = await connectToZupass(element);
      
      if (!userPublicKey) {
        throw new Error('Failed to connect to Zupass');
      }
      
      // Successfully connected, redirect to home page
      goto('/');
    } catch (err) {
      error = err.message;
      console.error('POD login error:', err);
    } finally {
      connecting = false;
    }
  }
</script>

<main class="container">
  <h1>Connect to Zupass</h1>
  
  {#if error}
    <div class="error">
      <p><strong>Error:</strong> {error}</p>
    </div>
  {/if}
  
  <div>
    <p>Connect to Zupass to access your POD tickets and RSVP to events:</p>
    <div id="zupass-connector"></div>
    <button 
      on:click={handlePODLogin} 
      disabled={connecting}
      class="primary"
    >
      {connecting ? 'Connecting...' : 'Connect with Zupass'}
    </button>
  </div>
  
  <style>
    .error {
      color: red;
      padding: 1rem;
      border: 1px solid red;
      margin-bottom: 1rem;
    }
    button {
      margin-top: 1rem;
    }
  </style>
</main>
