import { connect } from "@parcnet-js/app-connector";
import * as p from "@parcnet-js/podspec";

// ============================================
// CONSTANTS
// ============================================

export const ZUPASS_URL = "https://zupass.org";
export const TICKETS_COLLECTION = "Tickets";
export const ATTENDANCE_COLLECTION = "Attendance";
export const LOCAL_STORAGE_KEY = "pod-issuer-keypair";

export const ZAPP_CONFIG = {
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
// STATE MANAGEMENT
// ============================================

let state = {
  z: null,
  connected: false,
  issuerPrivateKey: null,
  issuerPublicKey: null,
  userPublicKey: null,
  lastIssuedTicket: null,
};

export function getState() {
  return { ...state };
}

export function setState(newState) {
  state = { ...state, ...newState };
}

// ============================================
// CRYPTO UTILITIES
// ============================================

/**
 * Generate a new EdDSA private key (32 random bytes as hex string)
 */
export function generatePrivateKey() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get public key from private key using @pcd/pod
 */
export function getPublicKey(privateKey) {
  return deriveSignerPublicKey(privateKey);
}

/**
 * Save keypair to localStorage
 */
export function saveKeypair(email, privateKey, publicKey) {
  const data = { email, privateKey, publicKey, createdAt: Date.now() };
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  return data;
}

/**
 * Load keypair from localStorage
 */
export function loadKeypair() {
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
export async function createTicketPOD(params) {
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
export async function createAttendancePOD(params) {
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

export async function connectToZupass(element) {
  state.z = await connect(ZAPP_CONFIG, element, ZUPASS_URL);
  state.connected = true;

  // Get user's public key
  state.userPublicKey = await state.z.identity.getPublicKey();

  return state.userPublicKey;
}

export async function insertPOD(collection, pod) {
  if (!state.connected) throw new Error("Not connected to Zupass");

  const zcollection = await state.z.pod.collection(collection);
  return await zcollection.insert(pod);
}

export async function queryPODs(collection, query) {
  if (!state.connected) throw new Error("Not connected to Zupass");
  const result = await state.z.pod.collection(collection).query(query);
  return result;
}

/**
 * Query tickets with optional signer filter
 */
export async function queryTickets(ownerPubKeys = [], eventId = null) {
  // Build the query using podspec
  const entrySpec = {
    pod_type: {
      type: "string",
      isMemberOf: [{ type: "string", value: "ticket.event" }]
    }
  };

  if (ownerPubKeys.length > 0) {
    entrySpec.owner = {
      type: "eddsa_pubkey",
      isMemberOf: ownerPubKeys.map(pk => ({ type: "eddsa_pubkey", value: pk }))
    };
  }

  // Add event filter if provided
  if (eventId) {
    entrySpec.event_id = {
      type: "string",
      isMemberOf: [{ type: "string", value: eventId }]
    };
  }

  const query = p.pod({ entries: entrySpec });
  const tickets = await queryPODs(TICKETS_COLLECTION, query);

  return tickets;
}

/**
 * Query attendance attestations
 */
export async function queryAttendance(ownerPubKeys = []) {
  const entrySpec = {
    pod_type: {
      type: "string",
      isMemberOf: [{ type: "string", value: "attendance.checkin" }]
    }
  };

  if (ownerPubKeys.length > 0) {
    entrySpec.owner = {
      type: "eddsa_pubkey",
      isMemberOf: ownerPubKeys.map(pk => ({ type: "eddsa_pubkey", value: pk }))
    };
  }

  const query = p.pod({ entries: entrySpec });
  const attestations = await queryPODs(ATTENDANCE_COLLECTION, query);

  return attestations;
}

/**
 * Find tickets that have matching attendance attestations
 */
export async function queryAttendedEvents(ownerPubKeys = [], eventId = null) {
  const tickets = await queryTickets(ownerPubKeys, eventId);
  const attestations = await queryAttendance(ownerPubKeys, eventId);

  // Create map of ticket signatures to attestations
  const attendanceMap = new Map();
  for (const att of attestations) {
    const entries = att.entries;
    const ticketSig = entries.ticket_signature?.value;
    if (ticketSig) {
      attendanceMap.set(ticketSig, att);
    }
  }

  // Match tickets with attestations
  const results = tickets.map(ticket => {
    const attendance = attendanceMap.get(ticket.signature);
    return {
      ticket,
      attendance,
      attended: !!attendance,
    };
  });

  return results;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function serializeForDisplay(data) {
  return JSON.stringify(data, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2);
}

export function formatPublicKey(key) {
  return key ? `${key.slice(0, 20)}...` : 'N/A';
}
