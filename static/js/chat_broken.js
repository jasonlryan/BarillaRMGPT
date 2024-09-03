console.log("chat.js is loading...");

$(document).ready(function () {
  console.log("chat.js has loaded and jQuery is ready");

  let abortController = null;

  function addMessage(sender, message) {
    console.log(`Adding message from ${sender}: ${message}`);
    const messageClass = sender === "You" ? "user-message" : "bot-message"; // No change needed here
    $("#chat-messages").append(
      `<div class="message ${messageClass}"><strong>${sender}:</strong> <span class="message-content">${message}</span></div>`
    );
    $("#chat-messages").scrollTop($("#chat-messages")[0].scrollHeight);
  }

  function showTypingIndicator() {
    console.log("Showing typing indicator");
    $("#chat-messages").append(
      '<div id="typing-indicator" class="message bot-message"><strong>Chatbot:</strong> <span class="typing-animation">Thinking<span>.</span><span>.</span><span>.</span></span></div>'
    );
    $("#chat-messages").scrollTop($("#chat-messages")[0].scrollHeight);
  }

  function removeTypingIndicator() {
    console.log("Removing typing indicator");
    $("#typing-indicator").remove();
  }

  function sendMessage() {
    var userMessage = $("#user-input").val();
    console.log("User input value:", userMessage);
    if (userMessage.trim() !== "") {
      console.log("Sending message:", userMessage);
      addMessage("You", userMessage);
      $("#user-input").val("");

      showTypingIndicator();

      $.ajax({
        url: "/chat",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({ message: userMessage }),
        xhrFields: {
          onprogress: function (e) {
            removeTypingIndicator();
            var response = e.currentTarget.response;
            var lines = response.split("\n\n");
            lines.forEach(function (line) {
              if (line.startsWith("data: ")) {
                try {
                  var data = JSON.parse(line.substring(6));
                  console.log("Received data:", data);
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
                    console.error("Error from server:", data.error);
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
          console.log("AJAX request completed");
          removeTypingIndicator();
          $("#current-response").removeAttr("id");
        },
        error: function (xhr, status, error) {
          console.error("An error occurred:", error);
          removeTypingIndicator();
          addMessage(
            "Chatbot",
            "An error occurred while processing your request."
          );
        },
      });
    } else {
      console.log("User message is empty");
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

  console.log("Adding initial message");
  addMessage(
    "Chatbot",
    "Welcome to the Barilla Retail Media Planning assistant. How can I help you today?"
  );

  $("#refresh-link").click(function (e) {
    e.preventDefault();

    // Clear the chat messages
    $("#chat-messages").empty();

    // Add the initial welcome message
    addMessage(
      "Chatbot",
      "Welcome to the Barilla Retail Media Planning assistant. How can I help you today?"
    );

    // Clear the user input
    $("#user-input").val("");
  });
});

function formatMarkdown(markdown) {
  // Your existing markdown parsing logic here

  // After parsing, wrap tables in a div
  formattedHtml = formattedHtml.replace(
    /<table>/g,
    '<div class="table-wrapper"><table>'
  );
  formattedHtml = formattedHtml.replace(/<\/table>/g, "</table></div>");

  return formattedHtml;
}

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

function addMessageToChat(message, isUser) {
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message", isUser ? "user-message" : "bot-message");

  if (!isUser) {
    const { mainContent, disclaimer } = processMessage(message);

    const contentP = document.createElement("p");
    contentP.innerHTML = mainContent;
    messageDiv.appendChild(contentP);

    if (disclaimer) {
      const disclaimerDiv = document.createElement("div");
      disclaimerDiv.classList.add("disclaimer");
      disclaimerDiv.innerHTML = disclaimer;
      messageDiv.appendChild(disclaimerDiv);
    }
  } else {
    messageDiv.innerHTML = message;
  }

  document.getElementById("chat-messages").appendChild(messageDiv);
}

async function sendMessage() {
  const userInput = document.getElementById("user-input").value;
  if (!userInput.trim()) return;

  addMessageToChat(userInput, true);
  document.getElementById("user-input").value = "";

  const button = document.getElementById("send-button");
  button.textContent = "Cancel";
  button.style.backgroundColor = "#ff4d4d"; // Red color for cancel

  abortController = new AbortController();

  try {
    const response = await fetch("/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: userInput }),
      signal: abortController.signal,
    });

    if (!response.ok) throw new Error("Network response was not ok");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let assistantMessage = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      assistantMessage += decoder.decode(value);
      // Update the chat with partial responses if desired
    }

    addMessageToChat(assistantMessage, false);

    // Force refresh after a short delay to ensure the message is displayed
    setTimeout(forceRefresh, 1000);
  } catch (error) {
    if (error.name === "AbortError") {
      addMessageToChat("Request was cancelled", false);
    } else {
      addMessageToChat("An error occurred", false);
      console.error("Error:", error);
    }
  } finally {
    resetButton();
  }
}

function cancelRequest() {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  fetch("/cancel", { method: "POST" })
    .then((response) => response.json())
    .then((data) => console.log(data))
    .catch((error) => console.error("Error:", error));
  resetButton();
}

function resetButton() {
  const button = document.getElementById("send-button");
  button.textContent = "Send";
  button.style.backgroundColor = ""; // Reset to default color
}

function forceRefresh() {
  location.reload(true);
}
