console.log("chat.js is loading...");

$(document).ready(function () {
  console.log("chat.js has loaded and jQuery is ready");

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

  $("#send-button").click(sendMessage);

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
});
