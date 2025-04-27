const GEMINI_API_KEY = 'AIzaSyBHZFappIZNCup70lTnh77ICrS3l191Uzc';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

let conversationHistory = [];
let allChats = JSON.parse(localStorage.getItem('allChats')) || [];

const inputField = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const sendButton = document.getElementById('send-btn');
const clearButton = document.getElementById('clear-chat');
const historyList = document.getElementById('history-list');

function addMessage(text, sender, isTyping = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;

    const timestamp = document.createElement('div');
    timestamp.className = 'timestamp';
    timestamp.textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    if (isTyping) {
        messageDiv.innerHTML = `<span class="typing-text"></span>`;
    } else {
        messageDiv.textContent = text;
    }

    messageDiv.appendChild(timestamp);
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

    return messageDiv.querySelector('.typing-text');
}

async function sendMessage() {
    const userMessage = inputField.value.trim();
    if (!userMessage) return;

    addMessage(userMessage, 'user');
    conversationHistory.push({ role: 'user', parts: [{ text: userMessage }] });

    inputField.value = "";

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message bot loading';
    loadingDiv.textContent = 'Typing';
    chatBox.appendChild(loadingDiv);

    let dotsInterval = setInterval(() => {
        loadingDiv.textContent += '.';
        if (loadingDiv.textContent.length > 10) loadingDiv.textContent = 'Typing';
    }, 500);

    try {
        const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: conversationHistory.slice(-6),
                generationConfig: { temperature: 0.7 }
            })
        });

        clearInterval(dotsInterval);
        chatBox.removeChild(loadingDiv);

        const data = await response.json();
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            let botReply = trimResponse(data.candidates[0].content.parts[0].text, 100);
            conversationHistory.push({ role: 'model', parts: [{ text: botReply }] });
            showTypingEffect(botReply);
        } else {
            throw new Error('No response from AI');
        }
    } catch (error) {
        clearInterval(dotsInterval);
        chatBox.removeChild(loadingDiv);
        alert(`Error: ${error.message}`);
    }
}

function trimResponse(text, maxWords) {
    const sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [text];
    let finalText = '', wordCount = 0;
    for (let sentence of sentences) {
        const count = sentence.trim().split(/\s+/).length;
        if (wordCount + count <= maxWords) {
            finalText += sentence.trim() + ' ';
            wordCount += count;
        } else break;
    }
    return finalText.trim();
}

function showTypingEffect(text) {
    const typingSpan = addMessage('', 'bot', true);
    let i = 0;
    const typingSpeed = 20;

    const typingInterval = setInterval(() => {
        if (i < text.length) {
            typingSpan.textContent += text.charAt(i);
            i++;
            chatBox.scrollTop = chatBox.scrollHeight;
        } else {
            clearInterval(typingInterval);
        }
    }, typingSpeed);
}

function saveConversation() {
    if (conversationHistory.length > 0) {
        allChats.push(conversationHistory);
        localStorage.setItem('allChats', JSON.stringify(allChats));
        loadHistory();
        conversationHistory = [];
    }
}

function loadHistory() {
    historyList.innerHTML = '';
    allChats.forEach((chat, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';

        const title = document.createElement('span');
        title.textContent = `Chat #${index + 1}`;
        title.style.flex = '1';
        title.style.cursor = 'pointer';
        title.addEventListener('click', () => loadChat(index));

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '❌';
        deleteBtn.style.background = 'none';
        deleteBtn.style.border = 'none';
        deleteBtn.style.color = 'red';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.title = 'Delete Chat';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteChat(index);
        });

        historyItem.appendChild(title);
        historyItem.appendChild(deleteBtn);

        historyList.appendChild(historyItem);
    });
}

function loadChat(index) {
    chatBox.innerHTML = '';
    const chat = allChats[index];
    chat.forEach(item => {
        const sender = item.role === 'user' ? 'user' : 'bot';
        const text = item.parts[0].text;
        addMessage(text, sender);
    });
}

function deleteChat(index) {
    if (confirm('Are you sure you want to delete this chat?')) {
        allChats.splice(index, 1);
        localStorage.setItem('allChats', JSON.stringify(allChats));
        loadHistory();
        chatBox.innerHTML = ''; 
    }
}

function clearCurrentChat() {
    if (conversationHistory.length > 0) saveConversation();
    chatBox.innerHTML = '';
}

sendButton.addEventListener('click', sendMessage);
inputField.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
clearButton.addEventListener('click', clearCurrentChat);

window.onload = () => {
    loadHistory();
    setTimeout(() => {
        if (conversationHistory.length === 0) {
            addMessage('👋 Hello! I am your Cybersecurity Assistant. How can I help you today?', 'bot');
        }
    }, 500);
};
