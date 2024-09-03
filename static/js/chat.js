console.log("chat.js is loading...");

$(document).ready(function () {
  let abortController = null;
  let currentThread = null;

  function addMessage(sender, message) {
    const messageClass = sender === "You" ? "user-message" : "bot-message";
    $("#chat-messages").append(
      `<div class="message ${messageClass}"><strong>${sender}:</strong> <span class="message-content">${message}</span></div>`
    );
    $("#chat-messages").scrollTop($("#chat-messages")[0].scrollHeight);
  }

  function showTypingIndicator() {
    $("#chat-messages").append(
      '<div id="typing-indicator" class="message bot-message"><strong>Chatbot:</strong> <span class="typing-animation">Thinking<span>.</span><span>.</span><span>.</span></span></div>'
    );
    $("#chat-messages").scrollTop($("#chat-messages")[0].scrollHeight);
  }

  function removeTypingIndicator() {
    $("#typing-indicator").remove();
  }

  function sendMessage() {
    var userMessage = $("#user-input").val();
    if (userMessage.trim() !== "") {
      addMessage("You", userMessage);
      $("#user-input").val("");

      showTypingIndicator();

      $.ajax({
        url: "/chat",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({
          message: userMessage,
          thread_id: currentThread,
        }),
        xhrFields: {
          onprogress: function (e) {
            removeTypingIndicator();
            var response = e.currentTarget.response;
            var lines = response.split("\n\n");
            lines.forEach(function (line) {
              if (line.startsWith("data: ")) {
                try {
                  var data = JSON.parse(line.substring(6));
                  if (data.thread_id) {
                    currentThread = data.thread_id;
                  }
                  if (data.full_response) {
                    if ($("#current-response").length === 0) {
                      $("#chat-messages").append(
                        '<div id="current-response" class="message bot-message"><strong>Chatbot:</strong> <span class="message-content"></span></div>'
                      );
                    }
                    $("#current-response .message-content").html(
                      marked.parse(data.full_response)
                    );
                    $("#chat-messages").scrollTop(
                      $("#chat-messages")[0].scrollHeight
                    );
                  } else if (data.error) {
                    addMessage("Chatbot", "An error occurred: " + data.error);
                  }
                } catch (error) {
                  console.error(
                    "Error parsing JSON:",
                    error,
                    "Raw data:",
                    line.substring(6)
                  );
                }
              }
            });
          },
        },
        complete: function () {
          removeTypingIndicator();
          $("#current-response").removeAttr("id");
          resetButton();
        },
        error: function (xhr, status, error) {
          removeTypingIndicator();
          addMessage(
            "Chatbot",
            "An error occurred while processing your request."
          );
          resetButton();
        },
      });
    }
  }

  $("#send-button").click(function () {
    if (this.textContent === "Send") {
      sendMessage();
      this.textContent = "Cancel";
      this.style.backgroundColor = "#ff4d4d";
    } else {
      cancelRequest();
    }
  });

  $("#user-input").keypress(function (e) {
    if (e.which == 13) {
      sendMessage();
    }
  });

  function cancelRequest() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    removeTypingIndicator();
    resetButton();
  }

  function resetButton() {
    const button = document.getElementById("send-button");
    button.textContent = "Send";
    button.style.backgroundColor = "";
  }

  function refreshChat(e) {
    console.log("refreshChat function called");
    e.preventDefault(); // Prevent the default link behavior
    cancelRequest();
    $("#chat-messages").empty();
    currentThread = null;
    addMessage(
      "Chatbot",
      "Welcome to the Barilla Retail Media Planning assistant. How can I help you today?"
    );
    console.log("Chat refreshed");
  }

  // Use the refresh-link instead of a button
  $("#refresh-link").click(function (e) {
    e.preventDefault();
    console.log("Refresh link clicked");

    // Cancel any ongoing request
    if (abortController) {
      abortController.abort();
      abortController = null;
    }

    // Clear chat messages
    $("#chat-messages").empty();

    // Reset the current thread
    currentThread = null;

    // Add the welcome message back
    addMessage(
      "Chatbot",
      "Welcome to the Barilla Retail Media Planning assistant. How can I help you today?"
    );

    console.log("Chat refreshed");
  });

  console.log("Document ready, event listeners set up");

  // Initial welcome message
  addMessage(
    "Chatbot",
    "Welcome to the Barilla Retail Media Planning assistant. How can I help you today?"
  );
});
function processMessage(message) {
  let mainContent = message;
  let disclaimer = "";

  const disclaimerIndex = message.indexOf(
    "Disclaimer: This information is generated"
  );
  if (disclaimerIndex !== -1) {
    mainContent = message.substring(0, disclaimerIndex).trim();
    disclaimer = message.substring(disclaimerIndex);
  }

  return { mainContent, disclaimer };
}
