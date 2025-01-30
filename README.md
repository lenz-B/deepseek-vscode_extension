# Build a VS Code Extension with DeepSeek R1 & Ollama  

**Introduction**  
Create your own AI coding assistant! This extension lets you chat with **DeepSeek R1** (a powerful open-source AI model) directly in VS Code using **Ollama** (a tool to run AI models locally). No subscriptions, no internet connection required!

---

## **Step 1: Setup & Prerequisites**  
1. **Install Tools**:  
   - [VS Code](https://code.visualstudio.com/)  
   - [Node.js & npm](https://nodejs.org/) (v18+)  
   - **Ollama**:  
     ```bash
     # Mac/Linux:  
     curl -fsSL https://ollama.ai/install.sh | sh
     # Windows: Download from https://ollama.ai/download
     ```  

2. **Install Extension Tools**:  
   ```bash
   npm install -g yo generator-code
   ```

3. **Download DeepSeek R1 Model**:
  chose model according to your system capability.(smallest 1.5b) 
   ```bash
   ollama run deepseek-r1:1.5b
   ```

---

## **Step 2: Create the VS Code Extension**  
1. **Generate Project**:  
   ```bash
   npx yo code
   ```  
   - Choose **TypeScript**  
   - Name: `deepseek-assistant`  
   - Accept defaults for other options.  

2. **Project Structure**:  
   - `src/extension.ts`: Main code  
   - `package.json`: Extension configuration  

---

## **Step 3: Integrate Ollama & DeepSeek R1**  
1. **Install Ollama SDK**:  
   ```bash
   npm install ollama
   ```

2. **Update `extension.ts`**:  
   ```typescript
   import * as vscode from 'vscode';
   import ollama from 'ollama';

   export function activate(context: vscode.ExtensionContext) {
     // Create a chat panel
     const panel = vscode.window.createWebviewPanel(
       'deepseekChat',
       'DeepSeek Assistant',
       vscode.ViewColumn.One,
       {}
     );

     // HTML for the chat UI
     panel.webview.html = getWebviewContent();

     // Handle messages from the UI
     panel.webview.onDidReceiveMessage(async (message) => {
       if (message.command === 'chat') {
         const response = await ollama.chat({
           model: 'deepseek-r1',
           messages: [{ role: 'user', content: message.text }],
           stream: true,
         });

         // Stream the response to the UI
         for await (const chunk of response) {
           panel.webview.postMessage({
             command: 'chatResponse',
             text: chunk.message.content,
           });
         }
       }
     });
   }

   function getWebviewContent(): string {
     return `
       <!DOCTYPE html>
       <html>
         <body>
           <textarea id="input" rows="5" cols="50"></textarea>
           <button onclick="sendPrompt()">Ask</button>
           <div id="response"></div>
           <script>
             const vscode = acquireVsCodeApi();
             function sendPrompt() {
               const input = document.getElementById('input').value;
               vscode.postMessage({ command: 'chat', text: input });
             }
             window.addEventListener('message', (event) => {
               document.getElementById('response').innerText += event.data.text;
             });
           </script>
         </body>
       </html>
     `;
   }
   ```

---

## **Step 4: Add a Command to VS Code**  
1. **Update `package.json`**:  
   ```json
   "contributes": {
     "commands": [{
       "command": "deepseek.startChat",
       "title": "Start DeepSeek Chat"
     }]
   }
   ```

2. **Register Command in `extension.ts`**:  
   ```typescript
   context.subscriptions.push(
     vscode.commands.registerCommand('deepseek.startChat', () => {
       activate(context);
     })
   );
   ```

---

## **Step 5: Test Your Extension**  
1. **Open Debugger**:  
   - Press `F5` in VS Code.  
   - A new VS Code window opens with your extension installed.  

2. **Run Command**:  
   - Press `Ctrl+Shift+P` and type **"Start DeepSeek Chat"**.  
   - Type a question (e.g., *"Explain binary search"*) and click **Ask**.  

3. **Troubleshooting**:  
   - **Ollama not running?** Start it with `ollama serve`.  
   - **Model missing?** Run `ollama pull deepseek-r1`.  

---

## **Step 6: Publish (Optional)**  
1. **Package Extension**:  
   ```bash
   npm install -g vsce
   vsce package
   ```  
   - Output: `deepseek-assistant-0.0.1.vsix`  

2. **Publish to Marketplace**:  
   Follow [VS Code Publishing Guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension).  

---

## **Final Tips**  
- Customize the UI with CSS for better visuals.  
- Add support for code suggestions or file editing.  
- Explore other models like **Llama 3** or **Mistral**.  

**Resources**:  
- [VS Code Extension API](https://code.visualstudio.com/api)  
- [Ollama Documentation](https://github.com/ollama/ollama)  

**You’ve built a private, open-source AI coding assistant!**

## YouTube Tutorials
1. [Using Ollama & Vs Code Extention](https://youtu.be/hAqBEm4wRsk)  
2. [Using Ollama, Docker, Open WebUI](https://youtu.be/clJCDHml2cA)

---