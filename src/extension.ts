import * as vscode from 'vscode';
import ollama from 'ollama';

// We'll create a separate class to manage our webview
class ChatPanel {
    public static currentPanel: ChatPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel) {
        this._panel = panel;

        // Set the webview's initial html content
        this._panel.webview.html = this._getWebviewContent();

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'chat':
                        await this._handleChatMessage(message.text);
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    public static createOrShow() {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it
        if (ChatPanel.currentPanel) {
            ChatPanel.currentPanel._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            'deepseekChat',
            'DeepSeek Assistant',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        ChatPanel.currentPanel = new ChatPanel(panel);
    }

    private async _handleChatMessage(text: string) {
        try {
            const response = await ollama.chat({
                model: 'deepseek-r1:1.5b',
                messages: [{ role: 'user', content: text }],
                stream: true,
            });

            for await (const chunk of response) {
                await this._panel.webview.postMessage({
                    command: 'chatResponse',
                    text: chunk.message.content,
                    done: false
                });
            }

            await this._panel.webview.postMessage({
                command: 'chatResponse',
                text: '',
                done: true
            });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            await this._panel.webview.postMessage({
                command: 'chatError',
                text: `Error: ${errorMessage}`
            });
            vscode.window.showErrorMessage(`AI Error: ${errorMessage}`);
        }
    }

    private _getWebviewContent() {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <style>
                    :root {
                        --vscode-background: #1e1e1e;
                        --primary-color: #2b2b2b;
                        --secondary-color: #363636;
                        --accent-color: #0078d4;
                        --text-color: #e0e0e0;
                        --border-radius: 8px;
                        --transition-speed: 0.2s;
                    }

                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    }

                    body {
                        background-color: var(--vscode-background);
                        color: var(--text-color);
                        padding: 1rem;
                        height: 100vh;
                        display: flex;
                        flex-direction: column;
                    }

                    #chat-container {
                        flex: 1;
                        overflow-y: auto;
                        margin-bottom: 1rem;
                        padding: 1rem;
                        display: flex;
                        flex-direction: column;
                        gap: 1rem;
                    }

                    .message {
                        display: flex;
                        gap: 1rem;
                        animation: fadeIn 0.3s ease-in-out;
                        padding: 1rem;
                        border-radius: var(--border-radius);
                        max-width: 85%;
                    }

                    .message.user {
                        background-color: var(--primary-color);
                        align-self: flex-end;
                    }

                    .message.assistant {
                        background-color: var(--secondary-color);
                        align-self: flex-start;
                    }

                    .message-avatar {
                        width: 28px;
                        height: 28px;
                        border-radius: 50%;
                        background-color: var(--accent-color);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        flex-shrink: 0;
                    }

                    .message-content {
                        line-height: 1.5;
                        white-space: pre-wrap;
                        word-wrap: break-word;
                    }

                    #input-container {
                        display: flex;
                        gap: 1rem;
                        padding: 1rem;
                        background-color: var(--primary-color);
                        border-radius: var(--border-radius);
                        position: sticky;
                        bottom: 0;
                    }

                    #input {
                        flex: 1;
                        background-color: var(--secondary-color);
                        border: none;
                        color: var(--text-color);
                        padding: 0.75rem 1rem;
                        border-radius: var(--border-radius);
                        resize: none;
                        min-height: 44px;
                        max-height: 200px;
                        transition: all var(--transition-speed);
                    }

                    #input:focus {
                        outline: 2px solid var(--accent-color);
                    }

                    #send-button {
                        background-color: var(--accent-color);
                        color: white;
                        border: none;
                        padding: 0.75rem 1.5rem;
                        border-radius: var(--border-radius);
                        cursor: pointer;
                        transition: all var(--transition-speed);
                        font-weight: 500;
                    }

                    #send-button:hover {
                        background-color: #0086f0;
                    }

                    #send-button:active {
                        transform: scale(0.98);
                    }

                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }

                    /* Scrollbar styling */
                    ::-webkit-scrollbar {
                        width: 8px;
                    }

                    ::-webkit-scrollbar-track {
                        background: var(--primary-color);
                    }

                    ::-webkit-scrollbar-thumb {
                        background: var(--secondary-color);
                        border-radius: 4px;
                    }

                    ::-webkit-scrollbar-thumb:hover {
                        background: #484848;
                    }

                    /* Loading indicator */
                    .typing-indicator {
                        display: flex;
                        gap: 0.5rem;
                        padding: 1rem;
                        align-items: center;
                    }

                    .typing-dot {
                        width: 8px;
                        height: 8px;
                        background: var(--accent-color);
                        border-radius: 50%;
                        animation: typingAnimation 1.4s infinite;
                        opacity: 0.6;
                    }

                    .typing-dot:nth-child(2) { animation-delay: 0.2s; }
                    .typing-dot:nth-child(3) { animation-delay: 0.4s; }

                    @keyframes typingAnimation {
                        0%, 60%, 100% { transform: translateY(0); }
                        30% { transform: translateY(-4px); }
                    }
                </style>
            </head>
            <body>
                <div id="chat-container"></div>
                <div id="input-container">
                    <textarea 
                        id="input" 
                        placeholder="Type your message..." 
                        rows="1"
                        aria-label="Message input"
                    ></textarea>
                    <button id="send-button" aria-label="Send message">Send</button>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    const chatContainer = document.getElementById('chat-container');
                    const input = document.getElementById('input');
                    const sendButton = document.getElementById('send-button');
                    let isResponding = false;

                    // Auto-resize textarea
                    input.addEventListener('input', function() {
                        this.style.height = 'auto';
                        this.style.height = Math.min(this.scrollHeight, 200) + 'px';
                    });

                    // Handle Enter key (Shift+Enter for new line)
                    input.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendPrompt();
                        }
                    });

                    sendButton.addEventListener('click', sendPrompt);

                    function createMessageElement(content, isUser) {
                        const messageDiv = document.createElement('div');
                        messageDiv.className = \`message \${isUser ? 'user' : 'assistant'}\`;

                        const avatar = document.createElement('div');
                        avatar.className = 'message-avatar';
                        avatar.textContent = isUser ? 'U' : 'A';

                        const contentDiv = document.createElement('div');
                        contentDiv.className = 'message-content';
                        contentDiv.textContent = content;

                        messageDiv.appendChild(avatar);
                        messageDiv.appendChild(contentDiv);
                        return messageDiv;
                    }

                    function createTypingIndicator() {
                        const indicator = document.createElement('div');
                        indicator.className = 'typing-indicator';
                        indicator.innerHTML = \`
                            <div class="message-avatar">A</div>
                            <div class="typing-dot"></div>
                            <div class="typing-dot"></div>
                            <div class="typing-dot"></div>
                        \`;
                        return indicator;
                    }

                    function sendPrompt() {
                        const text = input.value.trim();
                        if (!text || isResponding) return;

                        // Add user message
                        chatContainer.appendChild(createMessageElement(text, true));
                        
                        // Add typing indicator
                        const typingIndicator = createTypingIndicator();
                        chatContainer.appendChild(typingIndicator);
                        
                        // Clear input and reset height
                        input.value = '';
                        input.style.height = 'auto';
                        
                        // Scroll to bottom
                        chatContainer.scrollTop = chatContainer.scrollHeight;
                        
                        isResponding = true;
                        let responseContent = '';

                        // Send message to extension
                        vscode.postMessage({ command: 'chat', text });

                        // Handle response
                        window.addEventListener('message', function responseHandler(event) {
                            if (event.data.command === 'chatResponse') {
                                if (!responseContent) {
                                    // Remove typing indicator when first chunk arrives
                                    chatContainer.removeChild(typingIndicator);
                                }
                                
                                if (!responseContent) {
                                    // Create new message element for first chunk
                                    const messageElement = createMessageElement(event.data.text, false);
                                    chatContainer.appendChild(messageElement);
                                } else {
                                    // Update existing message content
                                    const lastMessage = chatContainer.lastElementChild;
                                    const contentDiv = lastMessage.querySelector('.message-content');
                                    contentDiv.textContent += event.data.text;
                                }
                                
                                responseContent += event.data.text;
                                chatContainer.scrollTop = chatContainer.scrollHeight;
                                
                                if (event.data.done) {
                                    isResponding = false;
                                    window.removeEventListener('message', responseHandler);
                                }
                            }
                        });
                    }
                </script>
            </body>
            </html>
        `;
    }

    public dispose() {
        ChatPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Activating DeepSeek extension...');

    // Register our command
    let disposable = vscode.commands.registerCommand('deepseek.startChat', () => {
        ChatPanel.createOrShow();
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {
    // Clean up resources
}

// -----------------------------------------------------------------------------------------------------------

// Basic UI
// -----------

// import * as vscode from 'vscode';
// import ollama from 'ollama';

// export function activate(context: vscode.ExtensionContext) {
//   // Register the command INSIDE the activate function
//   context.subscriptions.push(
//     vscode.commands.registerCommand('deepseek.startChat', () => {
//       // Create panel WHEN COMMAND IS EXECUTED
//       const panel = vscode.window.createWebviewPanel(
//         'deepseekChat',
//         'DeepSeek Assistant',
//         vscode.ViewColumn.One,
//         {
//           enableScripts: true // Required for webview communication
//         }
//       );

//       panel.webview.html = getWebviewContent();

//       // Handle messages from webview
//       panel.webview.onDidReceiveMessage(async (message) => {
//         if (message.command === 'chat') {
//           try {
//             const response = await ollama.chat({
// 							model: 'deepseek-r1:1.5b', // ← Exact model name
// 							// model: 'deepseek-ai/deepseek-r1-7b-chat', // ← Exact model name
// 							messages: [{ role: 'user', content: message.text }],
// 							stream: true,
// 						});

//             for await (const chunk of response) {
//               panel.webview.postMessage({
//                 command: 'chatResponse',
//                 text: chunk.message.content
//               });
//             }
//           } catch (error) {
//             vscode.window.showErrorMessage(`AI Error: ${error}`);
//           }
//         }
//       });
//     })
//   );
// }

// function getWebviewContent(): string {
//   return `
//     <!DOCTYPE html>
//     <html>
//     <body>
//       <textarea id="input" rows="5" cols="50"></textarea>
//       <button onclick="sendPrompt()">Ask</button>
//       <div id="response" style="white-space: pre-wrap;"></div>
//       <script>
//         const vscode = acquireVsCodeApi();
//         function sendPrompt() {
//           const input = document.getElementById('input').value;
//           vscode.postMessage({ command: 'chat', text: input });
//         }
//         window.addEventListener('message', (event) => {
//           const responseDiv = document.getElementById('response');
//           responseDiv.innerText += event.data.text;
//         });
//       </script>
//     </body>
//     </html>
//   `;
// }


// // The module 'vscode' contains the VS Code extensibility API
// // Import the module and reference it with the alias vscode in your code below
// import * as vscode from 'vscode';

// // This method is called when your extension is activated
// // Your extension is activated the very first time the command is executed
// export function activate(context: vscode.ExtensionContext) {

// 	// Use the console to output diagnostic information (console.log) and errors (console.error)
// 	// This line of code will only be executed once when your extension is activated
// 	console.log('Congratulations, your extension "deepseek-r1" is now active!');

// 	// The command has been defined in the package.json file
// 	// Now provide the implementation of the command with registerCommand
// 	// The commandId parameter must match the command field in package.json
// 	const disposable = vscode.commands.registerCommand('deepseek-r1.helloWorld', () => {
// 		// The code you place here will be executed every time your command is executed
// 		// Display a message box to the user
// 		vscode.window.showInformationMessage('Hello World from deepseek-r1!');
// 	});

// 	context.subscriptions.push(disposable);
// }

// // This method is called when your extension is deactivated
// export function deactivate() {}