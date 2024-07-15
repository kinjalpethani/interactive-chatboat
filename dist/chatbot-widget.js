(function() {
    var widgetContainer = document.createElement('div');
    widgetContainer.id = 'chatbot-widget-container';
    widgetContainer.style.display = 'none'; // Initially hidden
    widgetContainer.style.position = 'fixed';
    widgetContainer.style.bottom = '20px';
    widgetContainer.style.right = '20px';
    widgetContainer.style.width = '400px';
    widgetContainer.style.height = '600px';
    widgetContainer.style.zIndex = '9999';
    widgetContainer.style.border = '1px solid #ccc';
    widgetContainer.style.backgroundColor = '#fff';
    widgetContainer.style.boxShadow = '0 0 10px rgba(0,0,0,0.1)';
    document.body.appendChild(widgetContainer);

    function loadChatbotWidget() {
        var iframe = document.createElement('iframe');
        iframe.src = 'http://127.0.0.1/chatboat/index.html'; // Set the correct path
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        widgetContainer.appendChild(iframe);

        var style = document.createElement('style');
        style.innerHTML = `
            .chat-content {
                position: fixed;
                bottom: 20px;
                width: 60px;
                height: 60px;
                background-image: url('http://127.0.0.1/chatboat/dist/chat-icon.png'); 
                background-size: cover;
                cursor: pointer;
                z-index: 1000;
            }
        `;
        document.head.appendChild(style);
    }

    window.ChatbotWidget = {
        open: function() {
            widgetContainer.style.display = 'block';
        },
        hide: function() {
            widgetContainer.style.display = 'none';
        }
    };

    loadChatbotWidget();
})();
