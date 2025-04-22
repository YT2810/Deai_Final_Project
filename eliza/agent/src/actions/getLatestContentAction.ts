// File: agent/src/actions/getLatestContentAction.ts
// MVP Action v4: Uses correct example structure, LLM identifies track, provides Gulfstream link.

import { type Action, type IAgentRuntime, type Memory, type State, type ActionExample, elizaLogger } from "@elizaos/core";

// --- Configuration ---
const GULFSTREAM_PP_TRACK_NAME_NORMALIZED = "gulfstream park";
const GULFSTREAM_PP_LINK = "https://gateway.pinata.cloud/ipfs/bafkreifkn5tq5csdgpzsyjhlkiuxm7n3pehmul7nhi6thrpna2r67ezyzq"; // YOUR REAL LINK
const SUPPORTED_TRACKS_FOR_CLARIFICATION = ["Gulfstream Park", "La Rinconada", "Santa Anita"];
const AGENT_NAME = "GateKey"; // Use the agent's name consistently
// --------------------

// --- Helper Function for NFT Check (Placeholder - Same as before) ---
async function checkNFTOwnership(userWalletAddress: string | undefined): Promise<boolean> {
  elizaLogger.info(`Simulating NFT check for wallet: ${userWalletAddress || 'unknown'}`);
  const testWallet = "0x556ffE28AF4661257F299a9a38e81cD937Adbe3f"; // REPLACE with your test wallet
  if (userWalletAddress && userWalletAddress.toLowerCase() === testWallet.toLowerCase()) {
    elizaLogger.info("NFT check simulation PASSED for test wallet.");
    return true;
  }
  elizaLogger.warn("NFT check simulation FAILED (or no wallet provided).");
  return false;
}
// --------------------------------------------------

export const getLatestContentAction: Action = {
  name: "GET_LATEST_CONTENT",
  similes: [
    "get magazine", "latest magazine", "revista", "get picks", "latest picks",
    "pronosticos", "past performances", "pp", "get pp", "get content",
    "download content", "get report", "horse racing info", "hipismo",
    "gulfstream", "la rinconada", "santa anita", "gp" // Include track names as triggers
  ],
  description: "Provides the download link for the latest horse racing content (primarily Gulfstream Park PPs) after attempting to identify the requested track and simulating access verification if a wallet is provided.",

  validate: async () => true,

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: any = {},
    callback
  ) => {
    elizaLogger.info(`Executing action: ${getLatestContentAction.name}`);
    const userText = message.content?.text || "";

    // --- 1. Use LLM to Identify the Race Track ---
    let identifiedTrackNormalized: string | null = null;
    let clarificationNeeded = false;

    if (userText.length > 2) {
      const trackIdentificationPrompt = `User message: "${userText}". Which race track is the user asking about? Choose ONLY ONE from: Gulfstream Park, La Rinconada, Santa Anita. Respond with lowercase name (e.g., 'gulfstream park') or 'AMBIGUOUS' or 'NONE'.`;
      try {
        elizaLogger.debug(`Calling LLM for track identification...`);
        const trackResponse = await runtime.ai.generateText({
          prompt: trackIdentificationPrompt,
          model: runtime.character.settings?.model || "deepseek/deepseek-chat",
          provider: runtime.character.modelProvider,
          temperature: 0.1, // Very low temp for classification
          max_tokens: 20
        });
        const llmResult = trackResponse.text?.toLowerCase().trim().replace(/["'.]/g, ''); // Clean LLM output
        elizaLogger.debug(`LLM track identification result: "${llmResult}"`);

        // Check if the result is one of our known keys
        if (llmResult && Object.keys(contentLinks).includes(llmResult)) {
             identifiedTrackNormalized = llmResult;
        } else if (llmResult === 'ambiguous' || llmResult === 'none' || !llmResult) {
            clarificationNeeded = true;
        } else { // LLM might have hallucinated a track name not in our list
             clarificationNeeded = true; // Treat unknown tracks as needing clarification for now
             elizaLogger.warn(`LLM identified track "${llmResult}" which is not explicitly supported with a link.`);
        }
      } catch (error) {
        elizaLogger.error("Error calling LLM for track identification:", error);
        clarificationNeeded = true;
      }
    } else {
      clarificationNeeded = true;
    }

    // --- 2. Handle Cases Based on Identification ---
    let responseText = "";
    let actionSuccess = false;

    if (identifiedTrackNormalized === GULFSTREAM_PP_TRACK_NAME_NORMALIZED) {
      const walletRegex = /0x[a-fA-F0-9]{40}/;
      const match = userText.match(walletRegex);
      const userWalletAddress = match ? match[0] : undefined;
      const hasAccess = await checkNFTOwnership(userWalletAddress);

      if (hasAccess) {
        responseText = `Okay! Access verified. Here is the link for the latest Gulfstream Park PPs: ${GULFSTREAM_PP_LINK}`;
        actionSuccess = true;
      } else {
        responseText = userWalletAddress
          ? `Verification failed for wallet ${userWalletAddress}. It doesn't seem to hold the required NFT for Gulfstream Park content.`
          : `Access to Gulfstream Park content requires verification. Please provide your wallet address holding the access NFT.`;
        actionSuccess = false;
      }
    } else if (identifiedTrackNormalized && identifiedTrackNormalized !== GULFSTREAM_PP_TRACK_NAME_NORMALIZED) {
      responseText = `Sorry, I understood you're asking for "${identifiedTrackNormalized}", but I currently only have content available for Gulfstream Park.`;
      actionSuccess = false;
    } else { // Includes clarificationNeeded = true
      const knownTracks = SUPPORTED_TRACKS_FOR_CLARIFICATION.join(', ');
      responseText = `Sorry, I couldn't determine the specific race track, or I don't have content for it yet. Which track are you interested in? I currently have content for: ${knownTracks}.`;
      actionSuccess = false;
    }

    callback({ text: responseText });
    return actionSuccess;
  },

  // Examples using the CORRECTED structure found in ElizaOS docs
  examples: [
    // Dialogue 1: Requesting Gulfstream explicitly
    [
      { // User's turn
        user: "{{user1}}", // Placeholder for user name/ID
        content: { text: "Can I get the Gulfstream Park PPs?" }
      },
      { // Agent's response after simulated successful verification
        user: AGENT_NAME, // Agent's name
        content: {
          text: `Okay! Access verified. Here is the link for the latest Gulfstream Park PPs: ${GULFSTREAM_PP_LINK}`,
          action: "GET_LATEST_CONTENT" // Action that produced this
        }
      }
    ],
    // Dialogue 2: Requesting with typo, simulated verification failure
     [
      { user: "{{user1}}", content: { text: "I need the gustri pp for 0x12345..." } },
      {
        user: AGENT_NAME,
        content: {
          text: "Verification failed for wallet 0x12345.... It doesn't seem to hold the required NFT for Gulfstream Park content.",
          action: "GET_LATEST_CONTENT" // Action ran but denied access
        }
      }
    ],
    // Dialogue 3: Requesting unsupported track
     [
      { user: "{{user1}}", content: { text: "latest magazine for santa anita" } },
      {
        user: AGENT_NAME,
        content: {
          text: `Sorry, I understood you're asking for "santa anita", but I currently only have content available for Gulfstream Park.`,
          action: "GET_LATEST_CONTENT" // Action ran but denied specific content
        }
      }
    ],
     // Dialogue 4: Unclear request
     [
      { user: "{{user1}}", content: { text: "dame la info" } },
      {
        user: AGENT_NAME,
        content: {
          text: `Sorry, I couldn't determine the specific race track, or I don't have content for it yet. Which track are you interested in? I currently have content for: Gulfstream Park, La Rinconada, Santa Anita.`,
          action: "GET_LATEST_CONTENT" // Action ran but requires clarification
        }
      }
    ]
  ] as ActionExample[][], // Type assertion remains the same
};