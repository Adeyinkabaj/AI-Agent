<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mainstreet Capital Chatbot</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        /* Custom scrollbar for chat area */
        #chat-messages::-webkit-scrollbar {
            width: 8px;
        }
        #chat-messages::-webkit-scrollbar-thumb {
            background-color: #cbd5e1; /* slate-300 */
            border-radius: 4px;
        }
        #chat-messages::-webkit-scrollbar-track {
            background-color: #f8fafc; /* slate-50 */
        }
    </style>
</head>
<body class="bg-gray-100 min-h-screen flex items-center justify-center p-4">

    <div class="w-full max-w-2xl bg-white rounded-xl shadow-2xl flex flex-col h-[80vh] overflow-hidden">

        <header class="p-4 bg-indigo-600 text-white shadow-lg flex items-center rounded-t-xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 mr-3">
                <path d="M12 2a10 10 0 0 0-9.2 13.5c.3.5.7.8 1.3.8h15.2c.6 0 1-.3 1.3-.8A10 10 0 0 0 12 2z"></path>
                <line x1="12" y1="18" x2="12" y2="22"></line>
                <line x1="9" y1="21" x2="15" y2="21"></line>
            </svg>
            <h1 class="text-xl font-bold">Teams IT Guru</h1>
        </header>

        <main id="chat-messages" class="flex-grow p-4 space-y-4 overflow-y-auto bg-gray-50">
            <div class="flex justify-start">
                <div class="bg-indigo-100 p-3 rounded-xl rounded-tl-none max-w-xs md:max-w-md shadow">
                    <p class="text-sm text-indigo-800 font-semibold">Teams IT Guru</p>
                    <p class="text-gray-800 mt-1">Hello! I'm your AI IT Support Specialist and general knowledge assistant. Ask me any technical or general question, and I'll find the best solution for you. For example: "How do I clear my browser cache?" or "What is the capital of Canada?"</p>
                </div>
            </div>
            </main>

        <footer class="p-4 bg-white border-t border-gray-200 flex items-center">
            <input type="text" id="user-input" placeholder="Type your question here..."
                    class="flex-grow p-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    onkeydown="if(event.key === 'Enter') sendMessage()">
            <button id="send-button" onclick="sendMessage()"
                    class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-5 rounded-r-lg transition duration-150 ease-in-out shadow-md disabled:opacity-50 flex items-center justify-center">
                <span id="send-text">Send</span>
                <svg id="loading-spinner" class="animate-spin h-5 w-5 text-white hidden" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </button>
        </footer>
    </div>

    <script>
        const chatMessages = document.getElementById('chat-messages');
        const userInput = document.getElementById('user-input');
        const sendButton = document.getElementById('send-button');
        const loadingSpinner = document.getElementById('loading-spinner');
        const sendText = document.getElementById('send-text');

        const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";
        const API_KEY = ""; // Canvas runtime provides the key

        // --- Utility Functions ---

        /**
         * Implements exponential backoff for API retries.
         */
        async function fetchWithBackoff(url, options, maxRetries = 5) {
            for (let i = 0; i < maxRetries; i++) {
                try {
                    const response = await fetch(url, options);
                    if (response.status !== 429) { // 429 is Too Many Requests
                        return response;
                    }
                    // Log: console.log(`Rate limit exceeded, retrying in ${Math.pow(2, i)} seconds...`);
                } catch (error) {
                    // Log: console.error(`Fetch error on attempt ${i + 1}:`, error);
                }

                if (i < maxRetries - 1) {
                    const delay = Math.pow(2, i) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
            throw new Error("API request failed after multiple retries.");
        }

        /**
         * Appends a message to the chat interface.
         * @param {string} text The message content.
         * @param {string} sender 'user' or 'bot'.
         * @param {Array<Object>} [sources=[]] Array of grounding sources.
         */
        function appendMessage(text, sender, sources = []) {
            const messageDiv = document.createElement('div');
            const contentDiv = document.createElement('div');
            const senderName = sender === 'user' ? 'You' : 'Teams IT Guru';

            contentDiv.classList.add('p-3', 'rounded-xl', 'shadow', 'max-w-xs', 'md:max-w-md');
            
            if (sender === 'user') {
                messageDiv.classList.add('flex', 'justify-end');
                contentDiv.classList.add('bg-indigo-600', 'text-white', 'rounded-br-none');
            } else {
                messageDiv.classList.add('flex', 'justify-start');
                contentDiv.classList.add('bg-indigo-100', 'text-gray-800', 'rounded-tl-none');
            }

            // Sender Name
            const nameP = document.createElement('p');
            nameP.classList.add('text-sm', 'font-semibold', sender === 'user' ? 'text-indigo-200' : 'text-indigo-800');
            nameP.textContent = senderName;
            contentDiv.appendChild(nameP);

            // Message Content
            const textP = document.createElement('p');
            textP.classList.add('mt-1', sender === 'user' ? 'text-white' : 'text-gray-800');
            textP.textContent = text;
            contentDiv.appendChild(textP);

            // Sources (only for bot)
            if (sender === 'bot' && sources.length > 0) {
                const sourceContainer = document.createElement('div');
                sourceContainer.classList.add('mt-2', 'pt-2', 'border-t', sender === 'user' ? 'border-indigo-500' : 'border-indigo-300', 'text-xs');
                
                const sourceTitle = document.createElement('p');
                sourceTitle.classList.add('font-medium', 'mb-1', sender === 'user' ? 'text-indigo-200' : 'text-indigo-700');
                sourceTitle.textContent = 'Sources:';
                sourceContainer.appendChild(sourceTitle);

                sources.forEach((source, index) => {
                    const sourceLink = document.createElement('a');
                    sourceLink.href = source.uri;
                    sourceLink.target = '_blank';
                    sourceLink.classList.add('block', 'hover:underline', 'truncate', sender === 'user' ? 'text-indigo-100' : 'text-indigo-600');
                    sourceLink.textContent = `${index + 1}. ${source.title}`;
                    sourceContainer.appendChild(sourceLink);
                });
                contentDiv.appendChild(sourceContainer);
            }

            messageDiv.appendChild(contentDiv);
            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to bottom
        }

        /**
         * Main function to handle sending a message and calling the API.
         */
        async function sendMessage() {
            const query = userInput.value.trim();
            if (!query) return;

            // 1. Display user message
            appendMessage(query, 'user');
            userInput.value = '';

            // 2. Set UI to loading state
            sendButton.disabled = true;
            sendText.classList.add('hidden');
            loadingSpinner.classList.remove('hidden');

            try {
                // System Instruction defines the bot's persona and rules
                // MODIFIED: This instruction now allows general knowledge answers while keeping the IT Guru name.
                const systemPrompt = "You are a helpful and knowledgeable assistant named 'Teams IT Guru'. Your primary expertise is IT support, but you are capable of answering general knowledge questions, providing summaries, and assisting with a wide range of topics. Provide concise, accurate, and friendly answers. Always use the search results provided to ensure the information is current and grounded.";
                
                const payload = {
                    contents: [{ parts: [{ text: query }] }],
                    
                    // Crucial for grounding: Enable Google Search
                    tools: [{ "google_search": {} }], 

                    systemInstruction: {
                        parts: [{ text: systemPrompt }]
                    },
                };

                const options = {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                };

                const response = await fetchWithBackoff(`${API_URL}?key=${API_KEY}`, options);
                const result = await response.json();
                
                const candidate = result.candidates?.[0];
                let botResponseText = "Sorry, I couldn't get a clear answer right now. Please try rephrasing your question.";
                let sources = [];

                if (candidate && candidate.content?.parts?.[0]?.text) {
                    botResponseText = candidate.content.parts[0].text;

                    // Extract grounding sources
                    const groundingMetadata = candidate.groundingMetadata;
                    if (groundingMetadata && groundingMetadata.groundingAttributions) {
                        sources = groundingMetadata.groundingAttributions
                            .map(attribution => ({
                                uri: attribution.web?.uri,
                                title: attribution.web?.title,
                            }))
                            .filter(source => source.uri && source.title);
                    }
                }

                // 3. Display bot message
                appendMessage(botResponseText, 'bot', sources);

            } catch (error) {
                console.error("Gemini API Error:", error);
                appendMessage(`An error occurred while connecting to the IT Guru service: ${error.message}. Please check your connection or try again later.`, 'bot');
            } finally {
                // 4. Reset UI state
                sendButton.disabled = false;
                sendText.classList.remove('hidden');
                loadingSpinner.classList.add('hidden');
                userInput.focus(); // Keep focus on input
            }
        }
    </script>
</body>
</html>
