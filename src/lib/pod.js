import { connect } from "@parcnet-js/app-connector";
import * as p from "@parcnet-js/podspec";
import { POD } from '@pcd/pod';

// ============================================
// CONSTANTS
// ============================================

export const ZUPASS_URL = "https://zupass.org";
export const TICKETS_COLLECTION = "Tickets";
export const ATTENDANCE_COLLECTION = "Attendance";
export const LOCAL_STORAGE_KEY = "pod-issuer-keypair";
export const POD_SIGNING_TIMEOUT = 60000; // Increased to 60 seconds

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
  userPublicKey: null
};

export function getState() {
  return { ...state };
}

export function setState(newState) {
  console.log("State change:", newState);
  state = { ...state, ...newState };
  console.log("New state:", {
    connected: state.connected,
    userPublicKey: state.userPublicKey ? `${state.userPublicKey.slice(0, 20)}...` : null,
    issuerPublicKey: state.issuerPublicKey ? `${state.issuerPublicKey.slice(0, 20)}...` : null
  });
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
  const privateKey = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  console.log("Generated new private key:", `${privateKey.slice(0, 20)}...`);
  return privateKey;
}

/**
 * Get public key from private key using @pcd/pod
 */
export function getPublicKey(privateKey) {
  const publicKey = deriveSignerPublicKey(privateKey);
  console.log("Derived public key from private key:", `${publicKey.slice(0, 20)}...`);
  return publicKey;
}

/**
 * Save keypair to localStorage
 */
export function saveKeypair(email, privateKey, publicKey) {
  const data = { email, privateKey, publicKey, createdAt: Date.now() };
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  console.log("Saved keypair to localStorage for email:", email);
  return data;
}

/**
 * Load keypair from localStorage
 */
export function loadKeypair() {
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!stored) {
    console.log("No keypair found in localStorage");
    return null;
  }
  try {
    const data = JSON.parse(stored);
    console.log("Loaded keypair from localStorage for email:", data.email);
    return data;
  } catch {
    console.error("Failed to parse keypair from localStorage");
    return null;
  }
}

// ============================================
// POD CREATION
// ============================================

/**
 * Create a ticket POD with timeout protection
 */
export async function createTicketPOD(params, privateKey) {

  const {
    eventName,
    eventId,
    ticketType,
    productId,
    attendeeName,
    attendeeEmail,
    attendeePublicKey,
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
    event_id: { type: "string", value: eventId || "test"},

    // Product info
    product_id: { type: "string", value: productId },

    // Attendee info
    attendee_name: { type: "string", value: attendeeName },
    attendee_email: { type: "string", value: attendeeEmail },

    // Owner's public key - this links the ticket to the user's identity
    owner: { type: "eddsa_pubkey", value: attendeePublicKey },

    // Timestamps
    issued_at: { type: "int", value: issuedAt },
  };

  try {
    if (!privateKey) {
      throw new Error("No private key available for signing");
    }

    // Use POD.sign directly
    let pod = POD.sign(entries, privateKey);

    pod.entries = entries;

    return pod;

  } catch (error) {
    console.error("POD signing failed:", error);
    throw new Error(`Failed to sign POD: ${error.message}`);
  }
}

/**
 * Create an attendance attestation POD
 */
export async function createAttendancePOD(params) {
  console.log("Starting attendance attestation creation with params:", {
    ticketSignature: params.ticketSignature,
    eventId: params.eventId,
    eventName: params.eventName,
    attendeePublicKey: params.attendeePublicKey ? `${params.attendeePublicKey.slice(0, 20)}...` : null
  });

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

  try {
    // Check if we have a valid connection
    if (!state.z || !state.connected) {
      throw new Error("Not connected to Zupass. Please connect first.");
    }

    const signingPromise = state.z.pod.sign(entries, state.issuerPrivateKey);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`POD signing operation timed out after ${POD_SIGNING_TIMEOUT/1000} seconds`));
      }, POD_SIGNING_TIMEOUT);
    });

    const pod = await Promise.race([signingPromise, timeoutPromise]);

    console.log("Attendance attestation POD created successfully:", {
      attestationId,
      signature: pod.signature
    });

    return {
      pod,
      attestationId,
      signature: pod.signature,
    };
  } catch (error) {
    console.error("Attendance attestation signing failed:", error);
    throw new Error(`Failed to sign attendance attestation: ${error.message}`);
  }
}

// ============================================
// ZUPASS OPERATIONS
// ============================================

export async function connectToZupass(element) {
  try {
    state.z = await connect(ZAPP_CONFIG, element, ZUPASS_URL);
    if (!state.z) {
      throw new Error("Zupass connection returned null/undefined");
    }

    // Get user's public key
    state.userPublicKey = await state.z.identity.getPublicKey();
    console.log("[pod] Retrieved user public key:", `${state.userPublicKey.slice(0, 20)}...`, state.z.identity);

    state.connected = true;
    console.log("[pod] Zupass connection completed successfully");
    
    // Log connection details
    console.log("[pod] Connection details:", {
      hasPod: !!state.z.pod,
      hasIdentity: !!state.z.identity,
      userPublicKey: state.userPublicKey
    });

    return state.userPublicKey;
  } catch (error) {
    console.error('[pod] Zupass connection failed:', error);
    throw error;
  }
}

export async function ensureZupassConnection(element) {
  console.log("[pod] Checking Zupass connection status...");
  console.log("[pod] Current state:", { 
    connected: state.connected, 
    userPublicKey: state.userPublicKey ? `${state.userPublicKey.slice(0, 10)}...` : "null",
    hasZupassInstance: !!state.z
  });
  
  if (!state.connected || !state.z) {
    console.log("[pod] Not connected or missing Zupass instance, initiating connection...");
    return await connectToZupass(element);
  }
  
  console.log("[pod] Already connected to Zupass");
  return state.userPublicKey;
}

export async function insertPOD(collection, pod) {
  console.log(`Inserting POD into collection: ${collection}`, pod);
  if (!state.connected) {
    console.error("Cannot insert POD - not connected to Zupass");
    throw new Error("Not connected to Zupass");
  }

  try {
    const zcollection = await state.z.pod.collection(collection);

    const result = await zcollection.insert(pod);

    console.log(`POD inserted successfully into ${collection}`, {
      signature: pod.signature,
      result,
      pod
    });

    return result;
  } catch (error) {
    console.error(`Failed to insert POD into ${collection}:`, error);
    throw error;
  }
}

export async function queryPODs(collection, query) {
  console.log(`Querying PODs from collection: ${collection}`);
  if (!state.connected) {
    console.error("Cannot query PODs - not connected to Zupass");
    throw new Error("Not connected to Zupass");
  }

  try {
    const result = await state.z.pod.collection(collection).query(query);
    return result;
  } catch (error) {
    console.error(`Failed to query PODs from ${collection}:`, error);
    throw error;
  }
}

/**
 * Query tickets with optional signer filter
 */
export async function queryTickets(ownerPubKeys = [], eventId = null) {
  console.log("Querying tickets with filters:", {
    ownerPubKeys: ownerPubKeys.length,
    eventId
  });

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

  console.log(`Found ${tickets.length} tickets matching criteria`);
  return tickets;
}

/**
 * Query attendance attestations
 */
export async function queryAttendance(ownerPubKeys = []) {
  console.log("Querying attendance attestations with filters:", {
    ownerPubKeys: ownerPubKeys.length
  });

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

  console.log(`Found ${attestations.length} attendance attestations matching criteria`);
  return attestations;
}

/**
 * Find tickets that have matching attendance attestations
 */
export async function queryAttendedEvents(ownerPubKeys = [], eventId = null) {
  console.log("Querying attended events with filters:", {
    ownerPubKeys: ownerPubKeys.length,
    eventId
  });

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

  console.log(`Matched ${results.length} tickets with attendance data`);
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

export function toInsertablePOD(pod) {
  const signature = pod.signature ?? pod._signature;
  const signerPublicKey = pod.signerPublicKey ?? pod._signerPublicKey;
  const entries =
    typeof pod.content?.toJSON === "function"
      ? pod.content.toJSON()
      : pod._content.toJSON(); 

  return { entries, signature, signerPublicKey };
}
