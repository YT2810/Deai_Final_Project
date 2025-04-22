# Deai_Final_Project
This is the final Project of DEAI bootcamp


# GateKey: Conversational Agent for Web3 Verified Digital Content Access

## Short Description

GateKey is a conversational AI agent prototype built with ElizaOS v1 and OpenRouter (using Google's Gemini Flash 1.5). Its goal is to simplify and secure access to exclusive digital content (such as horse racing Past Performances - PPs, sports picks, reports, etc.). This MVP demonstrates on-chain verification (on Sepolia Testnet) of an access NFT (ERC721) before delivering the requested content (stored on IPFS).

## The Problem: Friction in Accessing Exclusive Content

Currently, users seeking specific content like horse racing PPs, sports picks, or reports often face fragmented processes:

*   Navigating multiple websites and performing exhaustive searches.
*   Depending on manual delivery via messaging apps (WhatsApp, Telegram) from providers.
*   Managing different logins and subscriptions for each content source.

These traditional methods lack efficiency, traceability, and do not grant users true ownership over their access rights.

## The Solution: GateKey - Conversational & Verified Access

GateKey proposes a unified, conversational interface (via chat) to request and receive digital content. Its key advantages are:

*   **Convenience:** Users simply ask for what they need in natural language.
*   **Decentralized Verification:** It leverages the blockchain (Sepolia Testnet in this MVP) to verify ownership of an NFT representing access rights or subscriptions. This offers a secure and transparent alternative to traditional logins.
*   **Secure Delivery:** Once access is verified, it delivers a direct link to the content (stored decentrally on IPFS via Pinata).
*   **Flexibility:** While the MVP focuses on horse racing PPs, the architecture allows managing access to any type of digital content (picks, reports, etc.) and can be adapted to different Web3 access mechanisms (other tokens, direct payments) or even function without Web3 verification for free content.

## Implemented Features (MVP)

*   Basic chat interface (via ElizaOS Client).
*   Natural Language Processing using LLM (OpenRouter - `google/gemini-2.0-flash-001`).
*   `GET_LATEST_CONTENT` Action:
    *   Identifies the requested race track (e.g., Gulfstream Park) based on simple text matching in the user's message.
    *   Extracts the wallet address if provided in the same message.
    *   **Performs REAL on-chain verification on Sepolia Testnet:** Calls `balanceOf` on the "AccessPass" ERC721 contract (`0x0887...`) to confirm if the wallet holds at least one access NFT.
    *   Delivers the IPFS link (Pinata Gateway) for **Gulfstream Park PPs** if and only if that track is requested and the on-chain NFT verification is successful.
    *   Responds appropriately if the track is missing, unsupported, or if NFT verification fails.

## Technologies Used

*   **Agent Framework:** ElizaOS v1 (0.25.9)
*   **Language:** TypeScript (for ElizaOS Actions/Core)
*   **Package Manager:** PNPM
*   **LLM Provider:** OpenRouter API
*   **LLM Model:** `google/google/gemini-2.0-flash-001` 
*   **Web3 Library:** Ethers.js v6
*   **Blockchain (Testnet):** Sepolia
*   **Access NFT Contract:** ERC721 "AccessPass" (Address: `0x08873b0cBBa6c13e2D9ed03Cc00BbA483CE25c1d` on Sepolia)
*   **Content Storage:** IPFS (via Pinata Gateway - URL: `https://gateway.pinata.cloud/ipfs/bafkreifkn5tq5csdgpzsyjhlkiuxm7n3pehmul7nhi6thrpna2r67ezyzq`)
*   **Development Environment:** WSL 2 (Ubuntu)

## How to Run Locally

1.  **Prerequisites:**
    *   Node.js (v18+ recommended)
    *   PNPM (`npm install -g pnpm`)
    *   Git
    *   WSL 2 (if on Windows)

2.  **Clone the Repository:**
    ```bash
    git clone https://github.com/YT2810/Deai_Final_Project.git
    cd Deai_Final_Project
    ```

3.  **Navigate to Eliza Directory:**
    ```bash
    cd eliza
    ```

4.  **Create and Configure `.env` File:**
    *   Create a file named `.env` in the `eliza/` directory (`touch .env`).
    *   Add your OpenRouter API key and the correct model name:
      ```dotenv
      OPENROUTER_API_KEY=sk-or-xxxxxxxxxxxxxxxxxxxxxx
      OPENROUTER_MODEL_NAME=google/gemini-2.0-flash-001
      # Add NFT_CONTRACT_ADDRESS and TESTNET_RPC_URL here if you move them from the action file
      ```

5.  **Install Dependencies:**
    ```bash
    pnpm install --no-frozen-lockfile
    ```

6.  **Build the Project:**
    ```bash
    pnpm build
    ```

7.  **Start the Agent Backend:**
    *   Open a terminal window in the `eliza/` directory.
    *   Run:
        ```bash
        pnpm start --character="characters/gatekey.character.json"
        ```

8.  **Start the Client Frontend:**
    *   Open a **second** terminal window in the `eliza/` directory.
    *   Run:
        ```bash
        pnpm start:client
        ```

9.  **Access the Agent:**
    *   Open the URL provided by the client (usually `http://localhost:5173`) in your web browser.

## How to Test (Main NFT Gating Flow)

1.  **Prerequisites for Testing:**
    *   A browser wallet (like MetaMask) connected to the **Sepolia Testnet**.
    *   Some Sepolia ETH for gas (use a faucet like [sepoliafaucet.com](https://sepoliafaucet.com/)).
    *   At least one "AccessPass" NFT minted from the contract `0x08873b0cBBa6c13e2D9ed03Cc00BbA483CE25c1d` on Sepolia in your test wallet. (You can use your own nft contract, You need to change the contract in the action section).

2.  **Test Scenarios:**
    *   **Success Case:** Send a message including the track and your NFT-holding wallet address:
        `I want the gp pps my wallet is 0x[YOUR_WALLET_ADDRESS_WITH_NFT]`
        *Expected Result:* Agent should reply "Access verified..." and provide the correct IPFS link.
    *   **Verification Failure Case:** Send a message including the track and a wallet address *without* the NFT:
        `Get the gp pp for 0x[WALLET_ADDRESS_WITHOUT_NFT]`
        *Expected Result:* Agent should reply "Verification failed for wallet... NFT not found...".
    *   **Missing Wallet Case:** Send a message asking for the content without providing a wallet:
        `gp pps please`
        *Expected Result:* Agent should reply "Access to Gulfstream Park content requires NFT verification... Please provide your wallet address...".
    *   **Unsupported Track Case:** Send a message asking for a different track:
        `santa anita pps`
        *Expected Result:* Agent should reply "Sorry, I currently only have content available for Gulfstream Park...".

## Known Limitations & Future Work

*   **Conversational State Management:** The agent currently lacks memory between turns. It processes each message somewhat independently, requiring users to sometimes repeat information (like the track name after providing a wallet). Implementing proper state management is a key next step for a smoother flow.
*   **Track Identification:** Relies on simple text matching. Re-enabling LLM-based track identification (pending resolution of internal API call errors) would improve robustness to typos and slang.
*   **Limited Content:** Only delivers a single, hardcoded PDF link for Gulfstream Park. Requires integration with a database or registry (potentially on-chain) to manage multiple content types, tracks, and dates dynamically.
*   **Wallet Verification Method:** Currently relies on the user pasting their address in the chat. Requires frontend integration with a "Connect Wallet" feature (using libraries like `ethers.js` or `wagmi`) for a secure and user-friendly experience.
*   **Advanced NFT Logic:** Does not implement features like expiring NFTs, different access tiers, or alternative minting/purchasing mechanisms. The current NFT contract is basic and `Ownable`.
*   **Deployment:** The agent is currently set up for local execution only. Deployment to a cloud service (like Vercel for the client and Render/Fly.io/VPS for the agent backend) is pending.

## (PENDING) Deployment

*(Add instructions and link here once deployed)*
