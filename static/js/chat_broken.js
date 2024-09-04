console.log("chat.js is loading...");

$(document).ready(function () {
  let abortController = null;
  let currentThread = null;
  let currentThreadId = null;
  let isRunActive = false;

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
    if (isRunActive) return; // Prevent sending if a run is active

    var userMessage = $("#user-input").val();
    if (userMessage.trim() !== "") {
      addMessage("You", userMessage);
      $("#user-input").val("");
      showTypingIndicator();
      disableSendButton();

      $.ajax({
        url: "/chat",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({
          message: userMessage,
          thread_id: currentThreadId,
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
                  if (data.event === "thread_created") {
                    currentThreadId = data.thread_id;
                    console.log("New thread created:", currentThreadId);
                  } else if (data.event === "run_started") {
                    isRunActive = true;
                    disableSendButton();
                  } else if (data.event === "run_completed") {
                    isRunActive = false;
                    enableSendButton();
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
                    enableSendButton();
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
          enableSendButton();
        },
        error: function (xhr, status, error) {
          removeTypingIndicator();
          addMessage(
            "Chatbot",
            "An error occurred while processing your request."
          );
          enableSendButton();
        },
      });
    }
  }

  function stopGenerating() {
    if (window.currentRequest) {
      window.currentRequest.abort();
      window.currentRequest = null;
      removeTypingIndicator();
      resetButton();
    }
  }

  $("#send-button").click(function () {
    sendMessage();
  });

  $("#user-input").keypress(function (e) {
    if (e.which == 13 && !isRunActive) {
      sendMessage();
    }
  });

  function cancelRequest() {
    if (window.currentRequest) {
      window.currentRequest.abort();
      window.currentRequest = null;
      removeTypingIndicator();
      resetButton();
    }
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

    // Reset the current thread ID
    currentThreadId = null;

    // Add the welcome message back
    addMessage(
      "Chatbot",
      "Welcome to the Barilla Retail Media Planning assistant. How can I help you today?"
    );

    // Make a POST request to reset the thread
    $.post("/reset_thread");

    console.log("Chat refreshed");
  });

  $("#refresh-button").click(function (e) {
    e.preventDefault();
    console.log("Refresh button clicked");

    // Reset the thread ID
    currentThreadId = null;

    // Clear chat messages
    $("#chat-messages").empty();

    // Add the welcome message back
    addMessage(
      "Chatbot",
      "Welcome to the Barilla Retail Media Planning assistant. How can I help you today?"
    );

    // Make a POST request to reset the thread
    $.post("/reset_thread");

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

function disableSendButton() {
  $("#send-button").prop("disabled", true).css("opacity", "0.5");
}

function enableSendButton() {
  $("#send-button").prop("disabled", false).css("opacity", "1");
}
