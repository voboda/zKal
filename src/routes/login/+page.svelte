<script>
	import { onMount } from 'svelte';
	import { PUBLIC_ZUPASS_PASSPORT_URL } from '$env/static/public';

	let pcd = '';
	let verifying = false;
	let errorMsg = '';
	let entries = [];
	let loading = true;

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
			window.location.href = '/';
		} catch (e) {
			errorMsg = e?.message || String(e);
		} finally {
			verifying = false;
		}
	}

	function loginWithZupass() {
		const url = PUBLIC_ZUPASS_PASSPORT_URL || 'https://zupass.org';
		window.open(url, '_blank', 'noopener');
	}

	onMount(async () => {
		try {
			const res = await fetch('/auth/config');
			const data = await res.json();
			entries = data?.entries ?? [];
		} catch (e) {
			console.error('Failed to load allowed entries:', e);
		} finally {
			loading = false;
		}

		const params = new URLSearchParams(window.location.search);
		const fromParam = params.get('pcd');
		if (fromParam) {
			verify(fromParam);
		}
	});
</script>

<div class="container">
	<dialog open class="modal">
		<article>
			<header>
				<h2>Login with Zupass</h2>
				{#if loading}
					<p>Loading allowed entries…</p>
				{:else if entries.length > 0}
					<p>You may log in with any of the following:</p>
					<ul>
						{#each entries as entry}
							<li><strong>{entry.label}</strong></li>
						{/each}
					</ul>
				{:else}
					<p style="color: crimson;">No allowed entries configured.</p>
				{/if}
			</header>

			<button on:click={loginWithZupass} disabled={verifying || loading}>Open Zupass</button>
			<p>
				After generating a proof in Zupass, paste the serialized PCD here and verify.
			</p>

			<label for="pcd">Serialized PCD</label>
			<textarea
				id="pcd"
				rows="6"
				bind:value={pcd}
				placeholder="Paste your Zupass proof (PCD) here"
			/>
			<button on:click={() => verify(pcd)} disabled={verifying || loading || !pcd}
				>Verify proof</button
			>

			{#if errorMsg}
				<p style="color: crimson;">{errorMsg}</p>
			{/if}
		</article>
	</dialog>
</div>
