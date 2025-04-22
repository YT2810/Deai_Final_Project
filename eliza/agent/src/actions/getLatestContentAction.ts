// File: agent/src/actions/getLatestContentAction.ts
// MVP Action v7.1: Uses REAL Sepolia contract/RPC, checks NFT ownership via balanceOf.

import { type Action, type IAgentRuntime, type Memory, type State, type ActionExample, elizaLogger } from "@elizaos/core";
import { ethers } from "ethers"; // Ethers.js library for blockchain interaction

// --- Web3 Configuration (REAL SEPOLIA DATA) ---
const NFT_CONTRACT_ADDRESS = "0x08873b0cBBa6c13e2D9ed03Cc00BbA483CE25c1d"; // YOUR Deployed Contract on Sepolia
const TESTNET_RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com";   // Public Sepolia RPC
// Minimal ABI needed just for the balanceOf function (standard ERC721)
const MINIMAL_ERC721_ABI_BALANCEOF = [
  "function balanceOf(address owner) view returns (uint256)"
];
// ----------------------------------------------------

// --- Configuration for Content ---
const GULFSTREAM_PP_TRACK_NAME_NORMALIZED = "gulfstream park";
const GULFSTREAM_PP_LINK = "https://gateway.pinata.cloud/ipfs/bafkreifkn5tq5csdgpzsyjhlkiuxm7n3pehmul7nhi6thrpna2r67ezyzq"; // Your content link
// List of OTHER tracks to recognize for specific 'unavailable' message
const OTHER_SUPPORTED_TRACKS_LOWERCASE: string[] = ["la rinconada", "santa anita", "aqueduct", "parx"];
// List for displaying clarification message
const ALL_KNOWN_TRACKS_DISPLAY = ["Gulfstream Park", "La Rinconada", "Santa Anita", "Aqueduct", "Parx"];
const AGENT_NAME = "GateKey";
// --------------------

// --- REAL NFT Check Function (Using balanceOf on Sepolia) ---
async function checkNFTOwnership(userWalletAddress: string | undefined): Promise<boolean> {
  if (!userWalletAddress) {
    elizaLogger.warn("(Action) NFT balance check skipped: No wallet address provided.");
    return false;
  }
  // Validate address format before making on-chain call
  if (!ethers.isAddress(userWalletAddress)) {
       elizaLogger.warn(`(Action) Invalid wallet address format provided: ${userWalletAddress}`);
       return false;
   }

  elizaLogger.info(`(Action) Performing NFT balance check for wallet: ${userWalletAddress} on Sepolia Testnet`);
  elizaLogger.debug(`(Action) Contract: ${NFT_CONTRACT_ADDRESS}, RPC: ${TESTNET_RPC_URL}`);

  try {
    // Connect to the Sepolia Testnet using the public RPC
    const provider = new ethers.JsonRpcProvider(TESTNET_RPC_URL);

    // Create a contract instance using the address and minimal ABI
    const nftContract = new ethers.Contract(NFT_CONTRACT_ADDRESS, MINIMAL_ERC721_ABI_BALANCEOF, provider);

    // Call the balanceOf function to get the number of NFTs owned by the user
    elizaLogger.debug(`(Action) Calling balanceOf(${userWalletAddress}) on contract ${NFT_CONTRACT_ADDRESS}...`);
    const balance = await nftContract.balanceOf(userWalletAddress);
    const balanceInt = parseInt(balance.toString(), 10); // Convert BigInt result to a number

    elizaLogger.debug(`(Action) Balance returned by contract: ${balanceInt}`);

    // Check if the user owns at least one NFT from this collection
    const hasAccess = balanceInt > 0;

    if (hasAccess) {
      elizaLogger.info("(Action) REAL NFT balance check PASSED (Balance > 0).");
    } else {
      elizaLogger.warn("(Action) REAL NFT balance check FAILED (Balance is 0).");
    }
    return hasAccess;

  } catch (error: any) {
    elizaLogger.error(`(Action) !!! ERROR during NFT balance check for ${userWalletAddress}:`, error.message || error);
    if (error.reason) { elizaLogger.error("--- Error Reason:", error.reason); }
    if (error.cause) { elizaLogger.error("--- Error Cause:", error.cause); }
    // Return false on any error to deny access by default
    return false;
  }
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
  description: "Provides the download link for the latest Gulfstream Park PPs after verifying ownership of an AccessPass NFT on Sepolia testnet.", // Updated description
  suppressInitialMessage: true, // Keep this to prevent double messages
  validate: async () => true,

  handler: async (
    _runtime: IAgentRuntime, // Runtime not needed currently
    message: Memory,
    _state: State,
    _options: any = {},
    callback
  ) => {
    elizaLogger.info(`Executing action: ${getLatestContentAction.name}`);
    const userText = message.content?.text?.toLowerCase() || "";

    // --- 1. Identify Race Track (SIMPLE Text Logic) ---
    let identifiedTrack: string | null = null;
    const gpRegex = /\b(gulfstream\s?park|gulfstream|gp|gustri)\b/i;
    if (gpRegex.test(userText)) {
        identifiedTrack = GULFSTREAM_PP_TRACK_NAME_NORMALIZED;
        elizaLogger.debug(`Track identified as Gulfstream from text match.`);
    } else {
        const otherKnownTracks = OTHER_SUPPORTED_TRACKS_LOWERCASE;
        for (const track of otherKnownTracks) {
             const trackRegex = new RegExp(`\\b${track.replace(/ /g, '\\s?')}\\b`, 'i');
             if (trackRegex.test(userText)) {
                identifiedTrack = track;
                break;
             }
        }
         if(identifiedTrack) {
             elizaLogger.debug(`Track identified as UNSUPPORTED (${identifiedTrack}) from text match.`);
         } else {
              elizaLogger.debug(`No specific track identified in text.`);
         }
    }

    // --- 2. Handle Cases ---
    let responseText = "";
    let actionSuccess = false;

    if (identifiedTrack === GULFSTREAM_PP_TRACK_NAME_NORMALIZED) {
      // Identified Gulfstream, proceed to REAL NFT check
      const walletRegex = /0x[a-fA-F0-9]{40}/i; // Extract wallet from message
      const match = userText.match(walletRegex);
      const userWalletAddress = match ? match[0] : undefined;

      // Call the REAL check function
      const hasAccess = await checkNFTOwnership(userWalletAddress);

      if (hasAccess) {
        responseText = `Okay! Access verified via NFT on Sepolia Testnet. Here is the link for Gulfstream Park PPs: ${GULFSTREAM_PP_LINK}`;
        actionSuccess = true;
      } else {
        responseText = userWalletAddress
          ? `Verification failed for wallet ${userWalletAddress}. Required AccessPass NFT not found on Sepolia Testnet.` // Updated message
          : `Access to Gulfstream Park content requires NFT verification on Sepolia Testnet. Please provide your wallet address holding the AccessPass NFT.`; // Updated message
        actionSuccess = false;
      }
    } else if (identifiedTrack) { // Identified a known track, but it's not Gulfstream
        const displayTrackName = identifiedTrack.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        responseText = `Sorry, I understood you asked about ${displayTrackName}, but content is currently only available for Gulfstream Park (and requires NFT verification).`;
        actionSuccess = false;
    } else { // Track not identified
      const knownTracksDisplay = ALL_KNOWN_TRACKS_DISPLAY.join(', ');
      responseText = `Sorry, please specify which race track you're interested in. I currently only have content for Gulfstream Park (recognized tracks: ${knownTracksDisplay}). Access requires NFT verification.`;
      actionSuccess = false;
    }

    callback({ text: responseText });
    return actionSuccess;
  },

  // Keep examples empty for safety
  examples: [] as any,

}; // End of Action definition