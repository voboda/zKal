/**
 * POD Ticket Issuer & Attendance Tracker
 *
 * Uses:
 * - @pcd/pod for server-side POD signing (issuer keys)
 * - @parcnet-js/app-connector for Zupass connection
 * - @parcnet-js/podspec for queries
 */

import { connect } from "@parcnet-js/app-connector";
import * as p from "@parcnet-js/podspec";
//import { POD, PODContent, deriveSignerPublicKey } from "@pcd/pod";

// ============================================
// CONSTANTS
// ============================================

const ZUPASS_URL = "https://zupass.org";
const TICKETS_COLLECTION = "Tickets";
const ATTENDANCE_COLLECTION = "Attendance";
const LOCAL_STORAGE_KEY = "pod-issuer-keypair";

const ZAPP_CONFIG = {
  name: "POD Ticket Issuer",
  permissions: {
    READ_PUBLIC_IDENTIFIERS: {},
    SIGN_POD: {},
    REQUEST_PROOF: { collections: [TICKETS_COLLECTION, ATTENDANCE_COLLECTION] },
    READ_POD: { collections: [TICKETS_COLLECTION, ATTENDANCE_COLLECTION] },
    INSERT_POD: { collections: [TICKETS_COLLECTION, ATTENDANCE_COLLECTION] },
    DELETE_POD: { collections: [TICKETS_COLLECTION, ATTENDANCE_COLLECTION] },
  },
};

// ============================================
// STATE
// ============================================

let state = {
  z: null,
  connected: false,
  issuerPrivateKey: null,
  issuerPublicKey: null,
  userPublicKey: null,
  lastIssuedTicket: null,
};

// ============================================
// CRYPTO UTILITIES
// ============================================

/**
 * Generate a new EdDSA private key (32 random bytes as hex string)
 */
function generatePrivateKey() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get public key from private key using @pcd/pod
 */
function getPublicKey(privateKey) {
  return deriveSignerPublicKey(privateKey);
}

/**
 * Save keypair to localStorage
 */
function saveKeypair(email, privateKey, publicKey) {
  const data = { email, privateKey, publicKey, createdAt: Date.now() };
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  return data;
}

/**
 * Load keypair from localStorage
 */
function loadKeypair() {
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

// ============================================
// POD CREATION
// ============================================

/**
 * Create a ticket POD
 */
async function createTicketPOD(params) {
  const {
    eventName,
    eventId,
    ticketType,
    productId,
    attendeeName,
    attendeeEmail,
    attendeePublicKey,
    privateKey,
  } = params;

  const ticketId = crypto.randomUUID();
  const issuedAt = BigInt(Date.now());

  const entries = {
    // POD type identifier
    pod_type: { type: "string", value: "ticket.event" },

    // Ticket identifiers
    ticket_id: { type: "string", value: ticketId },

    // Event info
    event_name: { type: "string", value: eventName },
    event_id: { type: "string", value: eventId },

    // Product info
    ticket_type: { type: "string", value: ticketType },
    product_id: { type: "string", value: productId },

    // Attendee info
    attendee_name: { type: "string", value: attendeeName },
    attendee_email: { type: "string", value: attendeeEmail },

    // Owner's public key - this links the ticket to the user's identity
    owner: { type: "eddsa_pubkey", value: attendeePublicKey },

    // Timestamps
    issued_at: { type: "int", value: issuedAt },
  };

  console.log("=== COMPLETE STATE BEFORE SIGNING ===");
  console.log("state.z:", state.z);
  console.log("state.connected:", state.connected);
  console.log("state.userPublicKey:", state.userPublicKey ? `${state.userPublicKey.slice(0, 20)}...` : null);
  console.log("state.issuerPrivateKey:", state.issuerPrivateKey ? `${state.issuerPrivateKey.slice(0, 20)}...` : null);
  console.log("state.issuerPublicKey:", state.issuerPublicKey ? `${state.issuerPublicKey.slice(0, 20)}...` : null);
  console.log("=== POD ENTRIES TO BE SIGNED ===");
  console.log("entries:", entries);
  console.log("=== PRIVATE KEY INFO ===");
  console.log("privateKey provided:", privateKey ? `${privateKey.slice(0, 20)}...` : null);
  console.log("privateKey length:", privateKey ? privateKey.length : 0);
  console.log("=== ZUPASS CONNECTION INFO ===");
  console.log("state.z type:", typeof state.z);
  console.log("state.z.pod:", state.z?.pod);
  console.log("state.z.pod.sign:", state.z?.pod?.sign);
  console.log("=================================");

  // Sign with issuer's private key
  const pod = await state.z.pod.sign(entries, privateKey);

  return {
    pod,
    ticketId,
    signature: pod.signature,
    signerPublicKey: pod.signerPublicKey,
  };
}

/**
 * Create an attendance attestation POD
 */
async function createAttendancePOD(params) {
  const {
    ticketSignature,
    eventId,
    eventName,
    attendeePublicKey,
    location,
    notes,
    privateKey,
  } = params;

  const attestationId = crypto.randomUUID();
  const checkedInAt = BigInt(Date.now());

  const entries = {
    // POD type identifier
    pod_type: { type: "string", value: "attendance.checkin" },

    // Attestation ID
    attestation_id: { type: "string", value: attestationId },

    // Link to the ticket
    ticket_signature: { type: "string", value: ticketSignature },

    // Event info (duplicated for easier querying)
    event_id: { type: "string", value: eventId },
    event_name: { type: "string", value: eventName },

    // Owner - must match ticket owner for valid attendance
    owner: { type: "eddsa_pubkey", value: attendeePublicKey },

    // Check-in metadata
    checked_in_at: { type: "int", value: checkedInAt },

    // Optional fields
    ...(location && { location: { type: "string", value: location } }),
    ...(notes && { notes: { type: "string", value: notes } }),
  };

  console.log("=== COMPLETE STATE BEFORE SIGNING ATTESTATION ===");
  console.log("state.z:", state.z);
  console.log("state.connected:", state.connected);
  console.log("state.userPublicKey:", state.userPublicKey ? `${state.userPublicKey.slice(0, 20)}...` : null);
  console.log("state.issuerPrivateKey:", state.issuerPrivateKey ? `${state.issuerPrivateKey.slice(0, 20)}...` : null);
  console.log("state.issuerPublicKey:", state.issuerPublicKey ? `${state.issuerPublicKey.slice(0, 20)}...` : null);
  console.log("=== ATTESTATION ENTRIES TO BE SIGNED ===");
  console.log("entries:", entries);
  console.log("=== PRIVATE KEY INFO ===");
  console.log("privateKey provided:", privateKey ? `${privateKey.slice(0, 20)}...` : null);
  console.log("privateKey length:", privateKey ? privateKey.length : 0);
  console.log("=== ZUPASS CONNECTION INFO ===");
  console.log("state.z type:", typeof state.z);
  console.log("state.z.pod:", state.z?.pod);
  console.log("state.z.pod.sign:", state.z?.pod?.sign);
  console.log("=================================");

  const pod = await state.z.pod.sign(entries, privateKey);

  return {
    pod,
    attestationId,
    signature: pod.signature,
  };
}

// ============================================
// ZUPASS OPERATIONS
// ============================================

async function simpleAdd(){
    log ('attendeePublicKey', state.userPublicKey);

    const ticketData = await createTicketPOD({
      eventName: $("event-name").value,
      eventId: $("event-id").value,
      ticketType: $("ticket-type").value,
      productId: $("product-id").value,
      attendeeName: $("attendee-name").value,
      attendeeEmail: $("attendee-email").value,
      attendeePublicKey: state.userPublicKey,
      privateKey: state.issuerPrivateKey,
    });

    log(`Ticket created. Signature: ${ticketData.signature}...`);
    log("Inserting ticket into Zupass...");

  //const pod = POD.fromJSON(ticketData.pod);
  const pod=ticketData.pod;
  const collection = TICKETS_COLLECTION;

  const zcollection = await state.z.pod.collection(collection)
  await zcollection.insert(pod);

    //await insertPOD(TICKETS_COLLECTION, ticketData.pod);
    //insertPOD(collection, ticketData);
    //await await state.z.pod.collection(collection).insert(pod);

    state.lastIssuedTicket = ticketData;
    $("attendance-ticket-sig").value = ticketData.signature;

    $("ticket-output").textContent = JSON.stringify({
      success: true,
      ticketId: ticketData.ticketId,
      signature: ticketData.signature,
      signerPublicKey: ticketData.signerPublicKey,
      //entries: ticketData.pod.content.asEntries(),
      entries: ticketData.pod.entries,
    }, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2);

    log("Ticket issued successfully!");

}

async function connectToZupass() {
  const element = document.getElementById("app-connector");
  state.z = await connect(ZAPP_CONFIG, element, ZUPASS_URL);
  state.connected = true;

  // Get user's public key
  state.userPublicKey = await state.z.identity.getPublicKey();

  return state.userPublicKey;
}

async function insertPOD(collection, pod) {
  if (!state.connected) throw new Error("Not connected to Zupass");
  //const pod = POD.fromJSON(serializedPOD);
  //const pod  = serializedPOD;

  const zcollection = await state.z.pod.collection(collection)
  return await zcollection.insert(pod);
}

async function queryPODs(collection, query) {
  if (!state.connected) throw new Error("Not connected to Zupass");
  const result = await state.z.pod.collection(collection).query(query);
  console.log(`Query for ${collection} returned ${result.length} items`);
  if (result.length > 0) {
    console.log('First item:', result[0]);
  }
  return result;
}

/**
 * Query tickets with optional signer filter
 */
async function queryTickets(ownerPubKeys = [], eventId = null) {
  console.log ("looking for tickets with owner", ownerPubKeys)
  // Build the query using podspec
  const entrySpec = {
    pod_type: {
      type: "string",
      isMemberOf: [{ type: "string", value: "ticket.event" }]
    }
  }

  if (ownerPubKeys.length > 0) {
    console.log('ownerPubKeys', ownerPubKeys)
    entrySpec.owner = {
      type: "eddsa_pubkey",
      isMemberOf: ownerPubKeys.map(pk => ({ type: "eddsa_pubkey", value: pk }))
    }
  };

  console.log('eventId 299',  eventId)
  // Add event filter if provided
  if (eventId) {
    entrySpec.event_id = {
      type: "string",
      isMemberOf: [{ type: "string", value: eventId }]
    };
  }

  const query = p.pod({ entries: entrySpec });

  console.log('310')
  let tickets = await queryPODs(TICKETS_COLLECTION, query);

  console.log('313')

  return tickets;
}

/**
 * Query attendance attestations
 */
async function queryAttendance(ownerPubKeys = []) {
  const entrySpec = {
    pod_type: {
      type: "string",
        isMemberOf: [{ type: "string", value: "attendance.checkin" }]
    }
  }

  if (ownerPubKeys.length > 0) {
    console.log('ownerPubKeys', ownerPubKeys)
    entrySpec.owner = {
      type: "eddsa_pubkey",
      isMemberOf: ownerPubKeys.map(pk => ({ type: "eddsa_pubkey", value: pk }))
    }
  };

  const query = p.pod({ entries: entrySpec });

  let attestations = await queryPODs(ATTENDANCE_COLLECTION, query);

  return attestations;
}

/**
 * Find tickets that have matching attendance attestations
 */
async function queryAttendedEvents(ownerPubKeys = [], eventId = null) {
  console.log('eventId', eventId)
  const tickets = await queryTickets(ownerPubKeys, eventId);
  const attestations = await queryAttendance(ownerPubKeys, eventId);

  console.log('QQQ')
  console.log(tickets)
  console.log(attestations)

  // Create map of ticket signatures to attestations
  const attendanceMap = new Map();
  for (const att of attestations) {
    const entries = att.entries;
    const ticketSig = entries.ticket_signature?.value;
    if (ticketSig) {
      attendanceMap.set(ticketSig, att);
    }
  }

  console.log(attendanceMap)

  // Match tickets with attestations
  const results = tickets.map(ticket => {
    const attendance = attendanceMap.get(ticket.signature);
    return {
      ticket,
      attendance,
      attended: !!attendance,
    };
  });

  console.log(results)

  return results;
}

// ============================================
// UI HELPERS
// ============================================

const $ = (id) => document.getElementById(id);
const log = (msg) => {
  const el = $("debug-log");
  const time = new Date().toLocaleTimeString();
  el.textContent = `[${time}] ${msg}\n` + el.textContent;
};

function updateStatus(message, type = "pending") {
  const el = $("status");
  el.textContent = message;
  el.className = `status ${type}`;
}

function enableButtons(enable) {
  $("btn-issue-ticket").disabled = !enable;
  $("btn-record-attendance").disabled = !enable;
  $("btn-query-attended").disabled = !enable;
  $("btn-query-all").disabled = !enable;
}

function displayKeyInfo() {
  if (!state.issuerPrivateKey) {
    $("key-info").style.display = "none";
    return;
  }

  $("key-info").style.display = "block";
  $("public-key").textContent = state.issuerPublicKey;
  $("private-key").textContent = state.issuerPrivateKey;

  // Pre-fill trusted signers with own key
  const trustedSigners = $("trusted-signers");
  if (!trustedSigners.value) {
    trustedSigners.value = state.issuerPublicKey;
  }
}

/**
 * Populate the ticket dropdown with available tickets
 */
async function populateTicketDropdown() {
  const dropdown = $("attendance-ticket-sig");
  if (!dropdown) return;

  // Clear existing options except the first one
  while (dropdown.options.length > 1) {
    dropdown.remove(1);
  }

  try {
    // Query all tickets
    const tickets = await queryTickets();

    // Add each ticket to the dropdown
    tickets.forEach(ticket => {
      const entries = ticket.entries;
      const eventName = entries.event_name?.value || "Unknown Event";
      const ticketId = entries.ticket_id?.value || "No ID";
      const signature = ticket.signature;

      const option = document.createElement("option");
      option.value = signature;
      option.textContent = `${eventName} - ${ticketId.slice(0, 8)}...`;
      option.title = signature; // Show full signature on hover

      dropdown.appendChild(option);
    });

    log(`Populated dropdown with ${tickets.length} tickets`);
  } catch (err) {
    log(`Error populating ticket dropdown: ${err.message}`);
  }
}

function renderTicketCard(ticket, attendance = null) {
  console.log('ticket', ticket);
  console.log('attendance', attendance);

  const entries = ticket.entries;
  const attended = !!attendance;

  let attendanceInfo = '';
  if (attended) {
    // Handle both POD object structure and direct entries
    const attEntries = attendance.entries || attendance;
    console.log('attEntries', attEntries);

    const checkedInAt = attEntries.checked_in_at?.value;
    const location = attEntries.location?.value;
    const notes = attEntries.notes?.value;

    attendanceInfo = `
      <div class="attendance-info">
        <h5>Attendance Record</h5>
        <div><strong>Checked in:</strong> ${checkedInAt ? new Date(Number(checkedInAt)).toLocaleString() : "N/A"}</div>
        ${location ? `<div><strong>Location:</strong> ${location}</div>` : ''}
        ${notes ? `<div><strong>Notes:</strong> ${notes}</div>` : ''}
        <div><strong>Attestation Signature:</strong> <code>${attendance.signature ? attendance.signature.slice(0, 30) + '...' : 'N/A'}</code></div>
      </div>
    `;
  }

  return `
    <div class="ticket-card ${attended ? 'attended' : ''}">
      <h4>
        ${entries.event_name?.value || "Unknown Event"}
        ${attended ? '<span class="attendance-badge">✓ Attended</span>' : '<span class="attendance-badge not-attended">Not Attended</span>'}
      </h4>
      <div><strong>Ticket Type:</strong> ${entries.ticket_type?.value || "N/A"}</div>
      <div><strong>Attendee:</strong> ${entries.attendee_name?.value || "N/A"} (${entries.attendee_email?.value || "N/A"})</div>
      <div class="meta">
        <div><strong>Event ID:</strong> ${entries.event_id?.value || "N/A"}</div>
        <div><strong>Ticket ID:</strong> ${entries.ticket_id?.value || "N/A"}</div>
        <div><strong>Ticket Signature:</strong> <code>${ticket.signature ? ticket.signature.slice(0, 30) + '...' : 'N/A'}</code></div>
        <div><strong>Signer:</strong> ${ticket.signerPublicKey ? ticket.signerPublicKey.slice(0, 20) + '...' : 'N/A'}</div>
        ${attendanceInfo}
      </div>
    </div>
  `;
}

// ============================================
// EVENT HANDLERS
// ============================================

async function handleConnect() {
  try {
    updateStatus("Connecting to Zupass...", "pending");
    log("Initiating Zupass connection...");

    const userPubKey = await connectToZupass();

    updateStatus(`Connected! User: ${userPubKey.slice(0, 16)}...`, "connected");
    log(`Connected. User public key: ${userPubKey}`);

    $("btn-connect").style.display = "none";
    $("btn-disconnect").style.display = "inline-block";
    enableButtons(true);

    // Pre-fill attendee email if we have issuer email
    const issuerEmail = $("issuer-email").value;
    if (issuerEmail && !$("attendee-email").value) {
      // Don't overwrite
    }

    // Populate the ticket dropdown
    await populateTicketDropdown();

  } catch (err) {
    updateStatus(`Connection failed: ${err.message}`, "disconnected");
    log(`Connection error: ${err.message}`);
  }
}

function handleGenerateKey() {
  const email = $("issuer-email").value;
  if (!email) {
    alert("Please enter an email for issuer identification");
    return;
  }

  try {
    state.issuerPrivateKey = generatePrivateKey();
    state.issuerPublicKey = getPublicKey(state.issuerPrivateKey);

    saveKeypair(email, state.issuerPrivateKey, state.issuerPublicKey);
    displayKeyInfo();

    log(`Generated new keypair for ${email}`);
    log(`Public key: ${state.issuerPublicKey}`);

  } catch (err) {
    log(`Key generation error: ${err.message}`);
    alert(`Error generating key: ${err.message}`);
  }
}

function handleLoadKey() {
  const stored = loadKeypair();
  if (!stored) {
    alert("No keypair found in localStorage");
    return;
  }

  state.issuerPrivateKey = stored.privateKey;
  state.issuerPublicKey = stored.publicKey;
  $("issuer-email").value = stored.email || "";

  displayKeyInfo();
  log(`Loaded keypair from localStorage (created: ${new Date(stored.createdAt).toLocaleString()})`);
}

async function handleIssueTicket() {
  if (!state.issuerPrivateKey) {
    alert("Please generate or load an issuer keypair first");
    return;
  }

  if (!state.connected) {
    alert("Please connect to Zupass first");
    return;
  }

  try {
    log("Creating ticket POD...");

    const ticketData = await createTicketPOD({
      eventName: $("event-name").value,
      eventId: $("event-id").value,
      ticketType: $("ticket-type").value,
      productId: $("product-id").value,
      attendeeName: $("attendee-name").value,
      attendeeEmail: $("attendee-email").value,
      attendeePublicKey: state.userPublicKey,
      privateKey: state.issuerPrivateKey,
    });

    log(`Ticket created. Signature: ${ticketData.signature.slice(0, 30)}...`);
    log("Inserting ticket into Zupass...");

    await insertPOD(TICKETS_COLLECTION, ticketData.pod);

    state.lastIssuedTicket = ticketData;
    $("attendance-ticket-sig").value = ticketData.signature;

    $("ticket-output").textContent = JSON.stringify({
      success: true,
      ticketId: ticketData.ticketId,
      signature: ticketData.signature,
      signerPublicKey: ticketData.signerPublicKey,
      entries: ticketData.pod.entries,
    }, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2);

    log("Ticket issued successfully!");

    // Refresh the ticket dropdown
    await populateTicketDropdown();

  } catch (err) {
    log(`Error issuing ticket: ${err.message}`);
    $("ticket-output").textContent = JSON.stringify({ error: err.message }, null, 2);
  }
}

async function handleRecordAttendance() {
  if (!state.issuerPrivateKey) {
    alert("Please generate or load an issuer keypair first");
    return;
  }

  if (!state.connected) {
    alert("Please connect to Zupass first");
    return;
  }

  const dropdown = $("attendance-ticket-sig");
  const ticketSig = dropdown.value;
  if (!ticketSig) {
    alert("Please select a ticket from the dropdown");
    return;
  }

  try {
    log("Finding ticket for attendance...");

    // Query to find the ticket
    const tickets = await queryTickets();
    const ticket = tickets.find(t => t.signature === ticketSig);

    if (!ticket) {
      throw new Error("Ticket not found with that signature");
    }

    const entries = ticket.entries;
    console.log('ticket entries', entries);

    // Verify the ticket owner matches connected user
    const ownerValue = entries.owner?.value;
    if (!ownerValue) {
      console.log('No owner found in ticket entries');
    }
    if (ownerValue !== state.userPublicKey) {
      console.log(`Owner mismatch: ticket owner ${ownerValue}, user ${state.userPublicKey}`);
      throw new Error("Ticket owner does not match connected user. User must prove ownership.");
    }

    log("User owns ticket. Creating attendance attestation...");

    const attendance = await createAttendancePOD({
      ticketSignature: ticketSig,
      eventId: entries.event_id?.value || "",
      eventName: entries.event_name?.value || "",
      attendeePublicKey: state.userPublicKey,
      location: $("checkin-location").value || null,
      notes: $("attendance-notes").value || null,
      privateKey: state.issuerPrivateKey,
    });

    log("Inserting attendance attestation...");
    console.log('att', attendance);
    await insertPOD(ATTENDANCE_COLLECTION, attendance.pod);

    $("attendance-output").textContent = JSON.stringify({
      success: true,
      attestationId: attendance.attestationId,
      signature: attendance.signature,
      linkedTicket: ticketSig,
    }, null, 2);

    log("Attendance recorded successfully!");

  } catch (err) {
    log(`Error recording attendance: ${err.message}`);
    $("attendance-output").textContent = JSON.stringify({ error: err.message }, null, 2);
  }
}

async function handleQueryAttended() {
  if (!state.connected) {
    alert("Please connect to Zupass first");
    return;
  }

  try {
    log("Querying attended events...");

    const signerInput = $("trusted-signers").value;
    const signers = signerInput
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0);

    //const eventId = $("query-event-id").value || null;

    const results = await queryAttendedEvents([await state.z.identity.getPublicKey()] );

    console.log('RESULTS', results)

    log(`Found ${results.length} tickets, ${results.filter(r => r.attended).length} attended`);

    // Debug: log the structure of results
    console.log('Query results:', results);
    results.forEach((r, i) => {
      console.log(`Result ${i}:`, {
        hasTicket: !!r.ticket,
        hasAttendance: !!r.attendance,
        attended: r.attended,
        ticketEntries: r.ticket?.entries,
        attendanceEntries: r.attendance?.entries
      });
    });

    // Render results
    const container = $("query-results");
    if (results.length === 0) {
      container.innerHTML = "<p>No tickets found matching criteria.</p>";
    } else {
      container.innerHTML = results
        .map(r => renderTicketCard(r.ticket, r.attendance))
        .join("");
    }

    // Refresh the ticket dropdown
    await populateTicketDropdown();

  } catch (err) {
    log(`Query error: ${err.message}`);
    $("query-results").innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
  }
}

async function handleQueryAll() {
  if (!state.connected) {
    alert("Please connect to Zupass first");
    return;
  }

  try {
    log("Querying all tickets...");

    const tickets = await queryTickets();

    log(`Found ${tickets.length} tickets`);

    const container = $("query-results");
    if (tickets.length === 0) {
      container.innerHTML = "<p>No tickets found.</p>";
    } else {
      container.innerHTML = tickets
        .map(t => renderTicketCard(t, null))
        .join("");
    }

    // Refresh the ticket dropdown
    await populateTicketDropdown();

  } catch (err) {
    log(`Query error: ${err.message}`);
    $("query-results").innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
  }
}

// ============================================
// INITIALIZATION
// ============================================

async function init() {
  // Try to load existing keypair
  const stored = loadKeypair();
  if (stored) {
    state.issuerPrivateKey = stored.privateKey;
    state.issuerPublicKey = stored.publicKey;
    $("issuer-email").value = stored.email || "";
    displayKeyInfo();
    log("Loaded existing keypair from localStorage");
  }

  // Bind event handlers
  $("btn-connect").onclick = handleConnect;
  $("btn-disconnect").onclick = () => location.reload();
  $("btn-generate-key").onclick = handleGenerateKey;
  $("btn-load-key").onclick = handleLoadKey;
  $("btn-issue-ticket").onclick = handleIssueTicket;
  $("btn-record-attendance").onclick = handleRecordAttendance;
  $("btn-query-attended").onclick = handleQueryAttended;
  $("btn-query-all").onclick = handleQueryAll;

  log("App initialized. Connect to Zupass to begin.");

  await handleConnect();
}

// Start the app
init();
