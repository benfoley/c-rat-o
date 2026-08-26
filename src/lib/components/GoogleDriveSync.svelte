<script lang="ts">
  import {
    RemoteChangedError,
    connect,
    disconnect,
    driveAccountEmail,
    driveClientId,
    driveConnected,
    driveLastSyncedAt,
    hasBakedInClientId,
    pullFromDrive,
    pushToDrive,
    setClientId,
  } from '../driveSync'

  let clientIdDraft = $state($driveClientId)
  let busy = $state(false)
  let message: string | null = $state(null)
  let error: string | null = $state(null)

  function saveClientId() {
    setClientId(clientIdDraft.trim())
  }

  async function handleConnect() {
    const clientId = hasBakedInClientId ? $driveClientId : clientIdDraft.trim()
    if (!clientId) {
      error = 'Enter a Google OAuth client ID first.'
      return
    }
    busy = true
    error = null
    message = null
    try {
      await connect(clientId)
      message = 'Connected to Google Drive.'
    } catch (err) {
      error = err instanceof Error ? err.message : String(err)
    } finally {
      busy = false
    }
  }

  function handleDisconnect() {
    disconnect()
    message = null
    error = null
  }

  async function handlePush(force = false) {
    busy = true
    error = null
    message = null
    try {
      await pushToDrive($driveClientId, { force })
      message = 'Pushed the current data to Google Drive.'
    } catch (err) {
      if (err instanceof RemoteChangedError) {
        if (confirm('The Drive backup has changed since this device last synced (likely from another device). Overwrite it with this device\'s data anyway?')) {
          await handlePush(true)
          return
        }
        error = 'Push cancelled — pull the latest data first to avoid losing the other device\'s changes.'
      } else {
        error = err instanceof Error ? err.message : String(err)
      }
    } finally {
      busy = false
    }
  }

  async function handlePull() {
    if (!confirm('Pulling from Drive will replace all data currently on this device. Continue?')) return
    busy = true
    error = null
    message = null
    try {
      await pullFromDrive($driveClientId)
      message = 'Pulled the latest data from Google Drive.'
    } catch (err) {
      error = err instanceof Error ? err.message : String(err)
    } finally {
      busy = false
    }
  }
</script>

<div class="card">
  <h2>Google Drive sync</h2>
  <p class="muted">
    Automates the backup file above via your own Google Drive: push after entering data on one
    device, pull before reporting on another. The app can only see files it creates itself, never
    the rest of your Drive.
  </p>

  {#if !$driveConnected}
    {#if !hasBakedInClientId}
      <div class="field">
        <label for="drive-client-id">Google OAuth client ID</label>
        <input
          id="drive-client-id"
          bind:value={clientIdDraft}
          onblur={saveClientId}
          placeholder="xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com"
        />
      </div>
      <p class="muted">
        Create a free OAuth client ID in the
        <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer"
          >Google Cloud Console</a
        > (APIs &amp; Services → Credentials → Create Credentials → OAuth client ID → Web
        application), then add this site's URL under "Authorized JavaScript origins". See SPEC.md
        for step-by-step notes.
      </p>
    {/if}
    <button type="button" class="btn" onclick={handleConnect} disabled={busy}>
      {busy ? 'Connecting…' : hasBakedInClientId ? 'Sign in with Google' : 'Connect Google Drive'}
    </button>
  {:else}
    <p class="pill status-active">Connected{#if $driveAccountEmail} as {$driveAccountEmail}{/if}</p>
    {#if $driveLastSyncedAt}
      <p class="muted">Last synced: {new Date($driveLastSyncedAt).toLocaleString()}</p>
    {/if}
    <div class="row">
      <button type="button" class="btn" onclick={() => handlePush(false)} disabled={busy}>
        {busy ? 'Working…' : 'Push to Drive'}
      </button>
      <button type="button" class="btn secondary" onclick={handlePull} disabled={busy}>
        {busy ? 'Working…' : 'Pull from Drive'}
      </button>
      <button type="button" class="btn secondary" onclick={handleDisconnect} disabled={busy}>Disconnect</button>
    </div>
  {/if}

  {#if message}<p>{message}</p>{/if}
  {#if error}<p style="color: var(--red);">{error}</p>{/if}
</div>
