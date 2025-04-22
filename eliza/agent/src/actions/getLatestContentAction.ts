// File: agent/src/actions/getLatestContentAction.ts
// MVP Action v5.1: FINAL STABLE - Relies on basic text matching for track ID.
// NO internal LLM call. Provides Gulfstream link after simulated NFT check.

import { type Action, type IAgentRuntime, type Memory, type State, type ActionExample, elizaLogger } from "@elizaos/core";

// --- Configuration ---
const GULFSTREAM_PP_TRACK_NAME_NORMALIZED = "gulfstream park";
const GULFSTREAM_PP_LINK = "https://gateway.pinata.cloud/ipfs/bafkreifkn5tq5csdgpzsyjhlkiuxm7n3pehmul7nhi6thrpna2r67ezyzq"; // YOUR REAL LINK
// List of OTHER tracks to recognize for specific 'unavailable' message
const OTHER_SUPPORTED_TRACKS_LOWERCASE: string[] = ["la rinconada", "santa anita", "aqueduct", "parx"];
// List for displaying clarification message
const ALL_KNOWN_TRACKS_DISPLAY = ["Gulfstream Park", "La Rinconada", "Santa Anita", "Aqueduct", "Parx"];
const AGENT_NAME = "GateKey";
// --------------------

// --- Helper Function for NFT Check (Placeholder) ---
async function checkNFTOwnership(userWalletAddress: string | undefined): Promise<boolean> {
  elizaLogger.info(`(Action) Simulating NFT check for wallet: ${userWalletAddress || 'unknown'}`);
  const testWallet = "0x556ffE28AF4661257F299a9a38e81cD937Adbe3f"; // !!! REPLACE with your test wallet address !!!
  if (userWalletAddress && userWalletAddress.toLowerCase() === testWallet.toLowerCase()) {
    elizaLogger.info("(Action) NFT check simulation PASSED.");
    return true;
  }
  elizaLogger.warn("(Action) NFT check simulation FAILED (or no wallet provided).");
  return false;
}
// --------------------------------------------------

export const getLatestContentAction: Action = {
  name: "GET_LATEST_CONTENT",
  similes: [ /* Keep broad similes */
    "get magazine", "latest magazine", "revista", "get picks", "latest picks",
    "pronosticos", "past performances", "pp", "get pp", "get content",
    "download content", "get report", "horse racing info", "hipismo",
    "gulfstream", "la rinconada", "santa anita", "gp", "aqueduct", "parx", "gustri"
  ],
  description: "Provides the download link for the latest horse racing content (currently only Gulfstream Park PPs) if the user specifies the track and passes simulated access verification.",
  suppressInitialMessage: true, // Keep this
  validate: async () => true,

  handler: async (
    _runtime: IAgentRuntime, // Runtime not needed for LLM calls here anymore
    message: Memory,
    _state: State,
    options: any = {}, // Keep options in case LLM passes trackName here later
    callback
  ) => {
    elizaLogger.info(`Executing action: ${getLatestContentAction.name}`);
    const userText = message.content?.text?.toLowerCase() || ""; // Ensure lowercase

    // --- 1. Determine Requested Track (SIMPLE Text Logic) ---
    let identifiedTrack: string | null = null;

    // Check explicit options first (if LLM ever sends it)
     if (options?.trackName && typeof options.trackName === 'string') {
        const trackLower = options.trackName.toLowerCase();
        if (trackLower === GULFSTREAM_PP_TRACK_NAME_NORMALIZED) {
            identifiedTrack = GULFSTREAM_PP_TRACK_NAME_NORMALIZED;
        } else if (OTHER_SUPPORTED_TRACKS_LOWERCASE.includes(trackLower)) {
            identifiedTrack = trackLower;
        }
        elizaLogger.debug(`Track identified from options: ${identifiedTrack}`);
    }

    // If not in options, check text
    if (!identifiedTrack) {
        // Check for Gulfstream (including abbreviations)
        const gpRegex = /\b(gulfstream\s?park|gulfstream|gp|gustri)\b/i; // Added gustri
        if (gpRegex.test(userText)) {
            identifiedTrack = GULFSTREAM_PP_TRACK_NAME_NORMALIZED;
            elizaLogger.debug(`Track identified as Gulfstream from text match.`);
        } else {
            // Check for other known unsupported tracks
            for (const track of OTHER_SUPPORTED_TRACKS_LOWERCASE) {
                 const trackRegex = new RegExp(`\\b${track.replace(/ /g, '\\s?')}\\b`, 'i');
                 if (trackRegex.test(userText)) {
                    identifiedTrack = track;
                    elizaLogger.debug(`Track identified as UNSUPPORTED (${track}) from text match.`);
                    break;
                 }
            }
        }
    }

    // --- 2. Handle Cases Based on Identification ---
    let responseText = "";
    let actionSuccess = false;

    if (identifiedTrack === GULFSTREAM_PP_TRACK_NAME_NORMALIZED) {
      // Identified Gulfstream, now check NFT (simulated)
      const walletRegex = /0x[a-fA-F0-9]{40}/i;
      const match = userText.match(walletRegex);
      const userWalletAddress = match ? match[0] : undefined;
      const hasAccess = await checkNFTOwnership(userWalletAddress);

      if (hasAccess) {
        responseText = `Okay! Access verified (simulated). Here is the link for the latest Gulfstream Park PPs: ${GULFSTREAM_PP_LINK}`;
        actionSuccess = true;
      } else {
        responseText = userWalletAddress
          ? `Verification failed for wallet ${userWalletAddress}. It doesn't seem to hold the required NFT for Gulfstream Park content.`
          : `Access to Gulfstream Park content requires verification. Please provide your wallet address holding the access NFT.`;
        actionSuccess = false;
      }
    } else if (identifiedTrack && OTHER_SUPPORTED_TRACKS_LOWERCASE.includes(identifiedTrack)) {
        // Identified a known track, but it's not Gulfstream
        const displayTrackName = identifiedTrack.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        responseText = `Sorry, I understood you were asking about ${displayTrackName}, but I currently only have content available for Gulfstream Park.`;
        elizaLogger.warn(`User asked for unsupported (but known) track: ${identifiedTrack}`);
        actionSuccess = false;
    } else { // Track is null or unknown
      const knownTracksDisplay = ALL_KNOWN_TRACKS_DISPLAY.join(', ');
      responseText = `Sorry, please specify which race track you're interested in. I currently have content for Gulfstream Park (I recognize tracks like: ${knownTracksDisplay}).`;
      elizaLogger.info("Could not identify a supported track from user message.");
      actionSuccess = false;
    }

    callback({ text: responseText });
    return actionSuccess; // Only true if link was provided
  },

  // Removed examples to ensure agent starts
  examples: [] as any,

}; // End of Action definition