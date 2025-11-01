<script>
  import { onMount } from 'svelte';
  import { PUBLIC_ZUPASS_PASSPORT_URL, PUBLIC_ZUPASS_EVENT_SLUG } from '$env/static/public';

  let pcd = '';
  let verifying = false;
  let errorMsg = '';

  async function verify(pcdStr) {
    verifying = true;
    errorMsg = '';
    try {
      const res = await fetch('/auth/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pcd: pcdStr })
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'verification failed');
      }
      // success
      window.location.href = '/';
    } catch (e) {
      errorMsg = e?.message || String(e);
    } finally {
      verifying = false;
    }
  }

  function loginWithZupass() {
    // Fallback: open Zupass; user can generate a proof for the event and paste it below.
    const url = PUBLIC_ZUPASS_PASSPORT_URL || 'https://zupass.org';
    window.open(url, '_blank', 'noopener');
  }

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const fromParam = params.get('pcd');
    if (fromParam) {
      // If Zupass redirected back with a serialized PCD
      verify(fromParam);
    }
  });
</script>

<div class="container">
  <dialog open class="modal">
    <article>
      <header>
        <h2>Login with Zupass</h2>
        <p>Required event: <code>{PUBLIC_ZUPASS_EVENT_SLUG}</code></p>
      </header>

      <button on:click={loginWithZupass} disabled={verifying}>Open Zupass</button>
      <p>
        After generating a proof for the required event in Zupass, paste the serialized proof here and verify.
      </p>

      <label for="pcd">Serialized PCD</label>
      <textarea id="pcd" rows="6" bind:value={pcd} placeholder="Paste your Zupass proof (PCD) here"></textarea>
      <button on:click={() => verify(pcd)} disabled={verifying || !pcd}>Verify proof</button>

      {#if errorMsg}
        <p style="color: crimson;">{errorMsg}</p>
      {/if}
    </article>
  </dialog>
</div>
